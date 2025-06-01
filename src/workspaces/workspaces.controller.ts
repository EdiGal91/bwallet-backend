import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  forwardRef,
  Inject,
  Delete,
  NotFoundException,
  Request,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';
import { Workspace } from './schemas/workspace.schema';
import { RequestWithUser } from '../common/types/request.types';
import { InviteMemberDto } from '../workspace-members/dto/invite-member.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
    @Inject(forwardRef(() => WorkspaceMembersService))
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  @Post()
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;

    // Create the workspace first
    const workspace = await this.workspacesService.create(
      createWorkspaceDto,
      userId,
    );

    // Get the workspace ID safely
    const workspaceId = workspace?.id || workspace?.['_id']?.toString();

    if (!workspaceId) {
      throw new Error('Failed to get workspace ID after creation');
    }

    // Add the creator as an owner member to the workspace
    try {
      await this.workspaceMembersService.addMember(
        workspaceId,
        { userId, role: 'owner' },
        userId,
      );
    } catch (error) {
      console.error('Error adding creator as owner:', error);
      // Instead of silently continuing, delete the workspace if we can't add the owner
      try {
        await this.workspacesService.remove(workspaceId, userId);
      } catch (deleteError) {
        console.error(
          'Error removing workspace after failed owner assignment:',
          deleteError,
        );
      }
      throw new Error('Failed to add creator as workspace owner');
    }

    return workspace;
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    const userId = req.user.userId;

    // Get all workspaces where user is owner (using role-based approach)
    const ownedWorkspaces = await this.workspacesService.findAll(userId);

    // Get IDs of all workspaces where user is a member
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    // If user is not a member of any other workspaces, just return owned ones
    if (!memberWorkspaceIds.length) {
      console.log(
        `User is not a member of any workspaces, returning ${ownedWorkspaces.length} owned workspaces`,
      );
      return ownedWorkspaces;
    }

    // Get workspace details for each workspace where user is a member
    const memberWorkspaces = await Promise.all(
      memberWorkspaceIds.map(async (workspaceId) => {
        try {
          // User is a verified member, so we can fetch the workspace
          const workspace = await this.workspacesService.findOne(workspaceId);
          return workspace;
        } catch (error) {
          console.error(`Error fetching workspace ${workspaceId}:`, error);
          return null;
        }
      }),
    );

    // Combine owned workspaces with member workspaces, filter out nulls
    // and ensure no duplicates by using a Map with workspace ID as key
    const workspacesMap = new Map<string, any>();

    [...ownedWorkspaces, ...memberWorkspaces.filter(Boolean)].forEach(
      (workspace) => {
        if (workspace) {
          // Access the ID safely with a fallback
          const workspaceId =
            workspace?.id || workspace?.['_id']?.toString() || '';
          if (workspaceId) {
            workspacesMap.set(workspaceId, workspace);
          }
        }
      },
    );

    const result = Array.from(workspacesMap.values()) as Workspace[];
    return result;
  }

  @Get(':workspaceId')
  async findOne(@Param('workspaceId') workspaceId: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;

    // First get the workspace
    const workspace = await this.workspacesService.findOne(workspaceId);

    // Check if user is authorized to access this workspace
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    if (!memberWorkspaceIds.includes(workspaceId)) {
      throw new NotFoundException(
        `Workspace not found or you don't have access to it`,
      );
    }

    return workspace;
  }

  @Post(':workspaceId/invite')
  async inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body() inviteDto: InviteMemberDto,
    @Request() req: any,
  ) {
    return this.workspacesService.inviteMember(workspaceId, inviteDto, req.user.userId);
  }

  @Patch(':workspaceId')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Body('name') name: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    const updated = await this.workspacesService.update(workspaceId, name, userId);
    return updated;
  }

  @Delete(':workspaceId')
  async remove(@Param('workspaceId') workspaceId: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;
    const result = await this.workspacesService.remove(workspaceId, userId);
    return result;
  }
}
