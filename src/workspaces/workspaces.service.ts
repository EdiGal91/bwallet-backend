import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @Inject(forwardRef(() => WorkspaceMembersService))
    private workspaceMembersService: WorkspaceMembersService,
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

  async findOne(id: string): Promise<Workspace> {
    // Find the workspace by ID
    const workspace = await this.workspaceModel.findById(id).exec();

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  async findById(id: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findById(id).exec();
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
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
      const roles = ['owner', 'admin', 'member', 'viewer'];
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

  async update(id: string, name: string, userId: string): Promise<Workspace> {
    // Check if user is owner or admin
    const hasPermission = await this.checkUserRole(id, userId, 'admin');

    if (!hasPermission) {
      throw new UnauthorizedException(
        'Only workspace owners and admins can update workspace details',
      );
    }

    const workspace = await this.workspaceModel.findOneAndUpdate(
      { _id: id },
      { name },
      { new: true },
    );

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ deleted: boolean; membersRemoved: number }> {
    // Check if user is owner
    const isOwner = await this.checkUserRole(id, userId, 'owner');

    if (!isOwner) {
      throw new UnauthorizedException(
        'Only workspace owners can delete workspaces',
      );
    }

    // First check if the workspace exists
    const workspace = await this.workspaceModel.findById(id);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    // Remove all members associated with this workspace
    const membersRemoved =
      await this.workspaceMembersService.removeAllMembersByWorkspace(id);

    // Now delete the workspace
    const result = await this.workspaceModel.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return { deleted: true, membersRemoved };
  }
}
