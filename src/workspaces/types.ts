import { Workspace } from './schemas/workspace.schema';
import { WorkspaceMember } from '../workspace-members/schemas/workspace-member.schema';
import { WorkspaceInvitation } from '../workspace-members/schemas/workspace-invitation.schema';

export type WorkspaceWithMembers = Workspace & {
  members: WorkspaceMember[];
  pendingInvitations: WorkspaceInvitation[];
}; 