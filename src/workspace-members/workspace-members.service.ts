import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WorkspaceMember,
  WorkspaceMemberDocument,
} from './schemas/workspace-member.schema';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UsersService } from '../users/users.service';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @InjectModel(WorkspaceMember.name)
    private workspaceMemberModel: Model<WorkspaceMemberDocument>,
    @Inject(forwardRef(() => WorkspacesService))
    private workspacesService: WorkspacesService,
    private usersService: UsersService,
  ) {}

  /**
   * Find all workspaces where a user has a specific role
   */
  async findWorkspacesByUserAndRole(
    userId: string,
    role: string,
  ): Promise<string[]> {
    const memberships = await this.workspaceMemberModel
      .find({ user: userId, role })
      .lean()
      .exec();

    return memberships
      .map((membership) => {
        const workspaceId = membership.workspace;
        if (!workspaceId) return '';
        return workspaceId.toString ? workspaceId.toString() : `${workspaceId}`;
      })
      .filter(Boolean);
  }

  /**
   * Find a member by workspace and user
   */
  async findMemberByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.workspaceMemberModel
      .findOne({ workspace: workspaceId, user: userId })
      .exec();
  }

  /**
   * Check if user has required permission in workspace
   */
  async checkUserPermission(
    workspaceId: string,
    userId: string,
    requiredRole: string,
  ): Promise<boolean> {
    const member = await this.findMemberByWorkspaceAndUser(workspaceId, userId);

    if (!member) {
      return false;
    }

    // Check role hierarchy
    const roles = ['owner', 'admin', 'viewer'];
    const userRoleIndex = roles.indexOf(member.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);

    // Lower index means higher privilege
    return userRoleIndex <= requiredRoleIndex;
  }

  /**
   * Add a user as a member to a workspace
   */
  async addMember(
    workspaceId: string,
    addMemberDto: AddWorkspaceMemberDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    // Verify the workspace exists
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if this is the first member being added (likely the creator/owner)
    const existingMembers = await this.findMembersByWorkspace(workspaceId);
    const isFirstMember = existingMembers.length === 0;

    // If this is not the first member, check permissions
    if (!isFirstMember) {
      // Check if requester has owner or admin role
      const hasPermission = await this.checkUserPermission(
        workspaceId,
        requesterId,
        'admin',
      );
      if (!hasPermission) {
        throw new NotFoundException(
          'Only workspace owners and admins can add members',
        );
      }
    } else {
      // For the first member, we only allow them to be added as owner and they must be the requester
      if (
        addMemberDto.role !== 'owner' ||
        addMemberDto.userId !== requesterId
      ) {
        throw new NotFoundException(
          'The first member added must be the creator as owner',
        );
      }
    }

    // Verify the user exists
    const user = await this.usersService.findById(addMemberDto.userId);
    if (!user) {
      throw new NotFoundException(
        `User with ID ${addMemberDto.userId} not found`,
      );
    }

    // Check if the member is already in the workspace
    const existingMembership = await this.workspaceMemberModel.findOne({
      workspace: workspaceId,
      user: addMemberDto.userId,
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Create the new membership
    const newMembership = new this.workspaceMemberModel({
      workspace: workspaceId,
      user: addMemberDto.userId,
      role: addMemberDto.role,
      joinedAt: new Date(),
    });

    return newMembership.save();
  }

  /**
   * Find all members of a workspace
   */
  async findMembersByWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return this.workspaceMemberModel
      .find({ workspace: workspaceId })
      .populate('user', 'email')
      .exec();
  }

  /**
   * Find all workspaces that a user is a member of
   */
  async findWorkspacesByUser(userId: string): Promise<string[]> {
    const memberships = await this.workspaceMemberModel
      .find({ user: userId })
      .lean()
      .exec();

    return memberships
      .map((membership) => {
        const workspaceId = membership.workspace;
        if (!workspaceId) return '';
        return workspaceId.toString ? workspaceId.toString() : `${workspaceId}`;
      })
      .filter(Boolean);
  }

  /**
   * Remove a user from a workspace
   */
  async removeMember(
    workspaceId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> {
    // Verify the workspace exists
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if requester has owner or admin role
    const hasPermission = await this.checkUserPermission(
      workspaceId,
      requesterId,
      'admin',
    );
    if (!hasPermission) {
      throw new NotFoundException(
        'Only workspace owners and admins can remove members',
      );
    }

    // Get the role of the member being removed
    const memberToRemove = await this.findMemberByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (memberToRemove && memberToRemove.role === 'owner') {
      // Check if requester is also an owner
      const requesterIsOwner = await this.checkUserPermission(
        workspaceId,
        requesterId,
        'owner',
      );
      if (!requesterIsOwner) {
        throw new NotFoundException(
          'Only workspace owners can remove other owners',
        );
      }
    }

    // Find and delete the membership
    const result = await this.workspaceMemberModel.deleteOne({
      workspace: workspaceId,
      user: userId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User is not a member of this workspace`);
    }
  }

  /**
   * Update a member's role in a workspace
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: string,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    // Verify the workspace exists
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if requester has owner role (only owners can change roles)
    const hasPermission = await this.checkUserPermission(
      workspaceId,
      requesterId,
      'owner',
    );
    if (!hasPermission) {
      throw new NotFoundException(
        'Only workspace owners can update member roles',
      );
    }

    // Find and update the membership
    const membership = await this.workspaceMemberModel.findOneAndUpdate(
      {
        workspace: workspaceId,
        user: userId,
      },
      { role },
      { new: true },
    );

    if (!membership) {
      throw new NotFoundException(`User is not a member of this workspace`);
    }

    return membership;
  }

  /**
   * Remove all members from a workspace when deleting the workspace
   */
  async removeAllMembersByWorkspace(workspaceId: string): Promise<number> {
    const result = await this.workspaceMemberModel.deleteMany({
      workspace: workspaceId,
    });

    return result.deletedCount;
  }

  async findMember(workspaceId: string, userId: string) {
    return this.workspaceMemberModel.findOne({
      workspace: workspaceId,
      user: userId,
    });
  }
}
