import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkspaceMember,
  WorkspaceMemberDocument,
} from './schemas/workspace-member.schema';
import {
  WorkspaceInvitation,
} from './schemas/workspace-invitation.schema';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UsersService } from '../users/users.service';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { NotificationsService } from '../notifications/services/notifications.service';
import { InvitationStatus } from './schemas/workspace-invitation.schema';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @InjectModel(WorkspaceMember.name)
    private workspaceMemberModel: Model<WorkspaceMemberDocument>,
    @InjectModel(WorkspaceInvitation.name)
    private workspaceInvitationModel: Model<WorkspaceInvitation>,
    @Inject(forwardRef(() => WorkspacesService))
    private workspacesService: WorkspacesService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
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
   * Add a member to a workspace without validation checks
   * Used when creating a new workspace and adding the creator as owner
   */
  async addMember(
    workspaceId: string,
    addMemberDto: AddWorkspaceMemberDto,
  ): Promise<WorkspaceMember> {
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
   * Invite a member to a workspace with full validation
   * Used when inviting existing users to a workspace
   */
  async inviteMember(
    workspaceId: string,
    inviteDto: InviteMemberDto,
    inviterId: string,
  ): Promise<void> {
    // Verify the workspace exists
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if inviter has admin or owner role
    const hasPermission = await this.checkUserPermission(
      workspaceId,
      inviterId,
      'admin',
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        'Only workspace owners and admins can invite members',
      );
    }

    // Find user by email
    const user = await this.usersService.findByEmail(inviteDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMember = await this.workspaceMemberModel.findOne({
      workspace: workspaceId,
      user: user.id,
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.workspaceInvitationModel.findOne({
      workspace: workspaceId,
      user: user.id,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new ConflictException('User already has a pending invitation');
    }

    // Generate invitation token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = new this.workspaceInvitationModel({
      workspace: workspaceId,
      user: user.id,
      inviter: inviterId,
      role: inviteDto.role,
      token,
      expiresAt,
    });

    await invitation.save();

    // Get inviter's user details for the invitation email
    const inviter = await this.usersService.findById(inviterId);
    if (!inviter) {
      throw new NotFoundException(`Inviter with ID ${inviterId} not found`);
    }
    const inviterName = inviter.firstName && inviter.lastName 
      ? `${inviter.firstName} ${inviter.lastName}`
      : inviter.email;

    // Send invitation email
    await this.notificationsService.sendWorkspaceInvitationNotification(
      user.email,
      workspace.name,
      inviterName,
      inviteDto.role,
      token,
    );
  }

  /**
   * Accept a workspace invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<WorkspaceMember> {
    // Find the invitation without expiry check
    const invitation = await this.workspaceInvitationModel.findOne({
      token,
      status: InvitationStatus.PENDING,
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    // Verify the user matches the invitation
    if (invitation.user.toString() !== userId) {
      throw new ForbiddenException('This invitation was sent to a different user');
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();
      throw new NotFoundException('Invitation has expired');
    }

    // Create the membership
    const membership = await this.addMember(invitation.workspace.toString(), {
      userId: invitation.user.toString(),
      role: invitation.role,
    });

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    await invitation.save();

    return membership;
  }

  /**
   * Decline a workspace invitation
   */
  async declineInvitation(token: string, userId: string): Promise<void> {
    // Find the invitation without expiry check
    const invitation = await this.workspaceInvitationModel.findOne({
      token,
      status: InvitationStatus.PENDING,
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    // Verify the user matches the invitation
    if (invitation.user.toString() !== userId) {
      throw new ForbiddenException('This invitation was sent to a different user');
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();
      throw new NotFoundException('Invitation has expired');
    }

    // Mark invitation as declined
    invitation.status = InvitationStatus.DECLINED;
    await invitation.save();
  }

  /**
   * Find all members of a workspace
   */
  async findMembersByWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return this.workspaceMemberModel
      .find({ workspace: workspaceId })
      .populate('user', ['email', 'firstName', 'lastName'])
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

  /**
   * Find all pending invitations for a workspace
   */
  async findPendingInvitationsByWorkspace(workspaceId: string) {
    const result= await this.workspaceInvitationModel
      .find({ 
        workspace: workspaceId,
        status: InvitationStatus.PENDING,
        expiresAt: { $gt: new Date() }
      })
      .populate('user', ['email', 'firstName', 'lastName'])
      .populate('inviter', ['email', 'firstName', 'lastName'])
      .exec();
    return result;
  }

  /**
   * Remove all pending invitations from a workspace
   */
  async removeAllPendingInvitationsByWorkspace(workspaceId: string): Promise<number> {
    const result = await this.workspaceInvitationModel.deleteMany({
      workspace: workspaceId,
    });

    return result.deletedCount;
  }

  /**
   * Get invitation details by token
   */
  async getInvitationByToken(token: string, userId: string) {
    const invitation = await this.workspaceInvitationModel
      .findOne({ token })
      .populate('workspace', ['name'])
      .populate('inviter', ['email', 'firstName', 'lastName'])
      .exec();

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify the user matches the invitation
    if (invitation.user.toString() !== userId) {
      throw new ForbiddenException('This invitation was sent to a different user');
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();
    }

    return invitation;
  }
}
