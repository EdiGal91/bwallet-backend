import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
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
    const workspace = await this.workspacesService.create(
      createWorkspaceDto,
      userId as any,
    );

    // Automatically add the creator as an admin member to the workspace
    try {
      await this.workspaceMembersService.addMember(
        workspace['id'] || workspace._id.toString(),
        { userId, role: 'admin' },
        userId,
      );
    } catch (error) {
      console.error('Error adding creator as member:', error);
      // We'll continue even if this fails, as the workspace was created successfully
    }

    return workspace;
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    const userId = req.user.userId;

    // Get all workspaces where user is owner
    const ownedWorkspaces = await this.workspacesService.findAll(userId);

    // Get IDs of all workspaces where user is a member
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    // If user is not a member of any other workspaces, just return owned ones
    if (!memberWorkspaceIds.length) {
      return ownedWorkspaces;
    }

    // Get workspace details for each workspace where user is a member
    const memberWorkspaces = await Promise.all(
      memberWorkspaceIds.map(async (id) => {
        try {
          // User is a verified member, so we can fetch the workspace without owner check
          return await this.workspacesService.findOne(id, userId, false);
        } catch (error) {
          console.error(`Error fetching workspace ${id}:`, error);
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
          const workspaceId = workspace['id'] || workspace._id.toString();
          workspacesMap.set(workspaceId, workspace);
        }
      },
    );

    return Array.from(workspacesMap.values());
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.userId;

    try {
      // First try to get the workspace as an owner
      return await this.workspacesService.findOne(id, userId, true);
    } catch (error) {
      // If not the owner, check if they're a member
      const memberWorkspaceIds =
        await this.workspaceMembersService.findWorkspacesByUser(userId);

      if (memberWorkspaceIds.includes(id)) {
        // User is a member, so we can fetch the workspace without owner check
        return await this.workspacesService.findOne(id, userId, false);
      }

      // If not an owner or member, rethrow the original error
      throw error;
    }
  }

  // This endpoint is deprecated - use workspace-members endpoints instead
  @Post(':id/members/:memberId')
  async addMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    // Add member through the workspace members service instead
    return this.workspaceMembersService.addMember(
      id,
      { userId: memberId },
      userId,
    );
  }
}
