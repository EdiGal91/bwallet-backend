import { Workspace } from './schemas/workspace.schema';
import { WorkspaceMember } from '../workspace-members/schemas/workspace-member.schema';

export interface WorkspaceWithMembers extends Omit<Workspace, 'members'> {
  members: WorkspaceMember[];
} 