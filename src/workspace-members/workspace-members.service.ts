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
   * Add a user as a member to a workspace
   */
  async addMember(
    workspaceId: string,
    addMemberDto: AddWorkspaceMemberDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    // Verify the workspace exists and requesterId is the owner
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if requesterId is the owner of the workspace
    if (workspace.owner.toString() !== requesterId) {
      throw new NotFoundException('Only the workspace owner can add members');
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
      role: addMemberDto.role || 'member',
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
      .select('workspace')
      .exec();

    return memberships.map((membership) => membership.workspace.toString());
  }

  /**
   * Remove a user from a workspace
   */
  async removeMember(
    workspaceId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> {
    // Verify the workspace exists and requesterId is the owner
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if requesterId is the owner of the workspace
    if (workspace.owner.toString() !== requesterId) {
      throw new NotFoundException(
        'Only the workspace owner can remove members',
      );
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
    // Verify the workspace exists and requesterId is the owner
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if requesterId is the owner of the workspace
    if (workspace.owner.toString() !== requesterId) {
      throw new NotFoundException(
        'Only the workspace owner can update member roles',
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
   * Migrate existing workspace members from the workspace schema to workspace-members collection
   */
  async migrateExistingMembers(): Promise<number> {
    // Get all workspaces
    const workspaces = await this.workspacesService.findAllForMigration();
    let migratedCount = 0;

    for (const workspace of workspaces) {
      // Skip if no members array or empty
      if (!workspace.members || workspace.members.length === 0) {
        continue;
      }

      // Add each member to the new collection
      for (const memberId of workspace.members) {
        try {
          // Skip if member is also the owner (they'll be added separately)
          if (memberId.toString() === workspace.owner.toString()) {
            continue;
          }

          // Check if already migrated
          const existingMembership = await this.workspaceMemberModel.findOne({
            workspace: workspace.id,
            user: memberId,
          });

          if (!existingMembership) {
            const newMembership = new this.workspaceMemberModel({
              workspace: workspace.id,
              user: memberId,
              role: 'member',
              joinedAt: workspace.createdAt, // Use workspace creation date as a fallback
            });
            await newMembership.save();
            migratedCount++;
          }
        } catch (error) {
          console.error(
            `Error migrating member ${memberId} for workspace ${workspace.id}:`,
            error,
          );
        }
      }

      // Always ensure the owner is a member with admin privileges
      try {
        const existingOwnerMembership = await this.workspaceMemberModel.findOne(
          {
            workspace: workspace.id,
            user: workspace.owner,
          },
        );

        if (!existingOwnerMembership) {
          const ownerMembership = new this.workspaceMemberModel({
            workspace: workspace.id,
            user: workspace.owner,
            role: 'admin',
            joinedAt: workspace.createdAt,
          });
          await ownerMembership.save();
          migratedCount++;
        }
      } catch (error) {
        console.error(
          `Error migrating owner for workspace ${workspace.id}:`,
          error,
        );
      }
    }

    return migratedCount;
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
}
