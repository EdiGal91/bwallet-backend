import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';
import { UsersService } from '../users/users.service';
import { InviteMemberDto } from '../workspace-members/dto/invite-member.dto';
import { WorkspaceMember } from '../workspace-members/schemas/workspace-member.schema';
import { WorkspaceWithMembers } from './types';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @Inject(forwardRef(() => WorkspaceMembersService))
    private workspaceMembersService: WorkspaceMembersService,
    private usersService: UsersService,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    // Parameter needed for signature compatibility with controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<Workspace> {
    const workspace = new this.workspaceModel({
      ...createWorkspaceDto,
    });
    return workspace.save();
  }

  async findAll(userId: string): Promise<Workspace[]> {
    // Get workspaces where user has owner role through workspace-members
    const ownerWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUserAndRole(
        userId,
        'owner',
      );

    // Find all these workspaces
    if (!ownerWorkspaceIds.length) {
      return [];
    }

    return this.workspaceModel
      .find({
        _id: { $in: ownerWorkspaceIds },
      })
      .exec();
  }
  /* eslint-enable */

  async findOne(workspaceId: string): Promise<WorkspaceWithMembers> {
    // Find the workspace by ID
    const workspace = await this.workspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Get workspace members
    const members = await this.workspaceMembersService.findMembersByWorkspace(workspaceId);

    // Convert to plain object and add members
    const workspaceObj = workspace.toJSON();
    return {
      ...workspaceObj,
      members,
    } as WorkspaceWithMembers;
  }

  async findById(workspaceId: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }
    return workspace;
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  // Check if a user has specified role or higher privileges in a workspace
  async checkUserRole(
    workspaceId: string,
    userId: string,
    requiredRole: string,
  ): Promise<boolean> {
    try {
      const member =
        await this.workspaceMembersService.findMemberByWorkspaceAndUser(
          workspaceId,
          userId,
        );

      if (!member) {
        return false;
      }

      // Check role hierarchy
      const roles = ['owner', 'admin', 'viewer'];
      const userRoleIndex = roles.indexOf(member.role);
      const requiredRoleIndex = roles.indexOf(requiredRole);

      // Lower index means higher privilege
      return userRoleIndex <= requiredRoleIndex;
    } catch {
      // Silently return false on errors
      return false;
    }
  }
  /* eslint-enable */

  async update(workspaceId: string, name: string, userId: string): Promise<Workspace> {
    // Check if user is owner or admin
    const hasPermission = await this.checkUserRole(workspaceId, userId, 'admin');

    if (!hasPermission) {
      throw new UnauthorizedException(
        'Only workspace owners and admins can update workspace details',
      );
    }

    const workspace = await this.workspaceModel.findOneAndUpdate(
      { _id: workspaceId },
      { name },
      { new: true },
    );

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    return workspace;
  }

  async remove(
    workspaceId: string,
    userId: string,
  ): Promise<{ deleted: boolean; membersRemoved: number }> {
    // Check if user is owner
    const isOwner = await this.checkUserRole(workspaceId, userId, 'owner');

    if (!isOwner) {
      throw new UnauthorizedException(
        'Only workspace owners can delete workspaces',
      );
    }

    // First check if the workspace exists
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Remove all members associated with this workspace
    const membersRemoved =
      await this.workspaceMembersService.removeAllMembersByWorkspace(workspaceId);

    // Now delete the workspace
    const result = await this.workspaceModel.deleteOne({ _id: workspaceId });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    return { deleted: true, membersRemoved };
  }

  async inviteMember(workspaceId: string, inviteDto: InviteMemberDto, inviterId: string) {
    // First check if the workspace exists and the inviter is a member
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if inviter is a member
    const inviterMember = await this.workspaceMembersService.findMember(workspaceId, inviterId);
    if (!inviterMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Find user by email
    let user = await this.usersService.findByEmail(inviteDto.email);
    if (user) {
      // Check if user is already a member
      const existingMember = await this.workspaceMembersService.findMember(workspaceId, user.id);
      if (existingMember) {
        throw new ConflictException('User is already a member of this workspace');
      }
  
      // Add the user as a member
      return this.workspaceMembersService.addMember(workspaceId, { userId: user.id, role: inviteDto.role }, inviterId);
    }
    // invited new user
    throw new NotFoundException('User not found');

  }
}
