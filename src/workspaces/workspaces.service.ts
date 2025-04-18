import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    user: User,
  ): Promise<Workspace> {
    const workspace = new this.workspaceModel({
      ...createWorkspaceDto,
      owner: user,
      // Don't add members here anymore, they'll be added to the WorkspaceMember collection
    });
    return workspace.save();
  }

  async findAll(userId: string): Promise<Workspace[]> {
    // Only find workspaces where the user is the owner
    // Members will be handled by the WorkspaceMembersService
    return this.workspaceModel
      .find({
        owner: userId,
      })
      .populate('owner', 'email')
      .exec();
  }

  async findOne(
    id: string,
    userId: string,
    isOwnerOnly = false,
  ): Promise<Workspace> {
    // If isOwnerOnly is true, only find if user is owner
    // Otherwise, membership validation would happen at the controller level
    const query = isOwnerOnly ? { _id: id, owner: userId } : { _id: id };

    const workspace = await this.workspaceModel
      .findOne(query)
      .populate('owner', 'email')
      .exec();

    if (!workspace) {
      throw new NotFoundException(
        `Workspace with ID ${id} not found or you don't have access to it`,
      );
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

  // This method is used for migration only and will be removed after migration
  async findAllForMigration(): Promise<Workspace[]> {
    return this.workspaceModel.find().exec();
  }

  // Legacy method - kept for reference but should not be used anymore
  // Use WorkspaceMembersService.addMember instead
  async addMember(
    workspaceId: string,
    ownerId: string,
    memberId: string,
  ): Promise<Workspace> {
    // Find workspace and make sure the requester is the owner
    const workspace = await this.workspaceModel.findOne({
      _id: workspaceId,
      owner: ownerId,
    });

    if (!workspace) {
      throw new NotFoundException(
        'Workspace not found or you are not the owner',
      );
    }

    // Initialize members array if it doesn't exist
    if (!workspace.members) {
      workspace.members = [];
    }

    // Add member if they aren't already a member
    if (!workspace.members.includes(memberId as any)) {
      workspace.members.push(memberId as any);
      await workspace.save();
    }

    return this.findOne(workspaceId, ownerId);
  }
}
