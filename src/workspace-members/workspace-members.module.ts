import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspaceMembersService } from './workspace-members.service';
import {
  WorkspaceMember,
  WorkspaceMemberSchema,
} from './schemas/workspace-member.schema';
import {
  WorkspaceInvitation,
  WorkspaceInvitationSchema,
} from './schemas/workspace-invitation.schema';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceMember.name, schema: WorkspaceMemberSchema },
      { name: WorkspaceInvitation.name, schema: WorkspaceInvitationSchema },
    ]),
    forwardRef(() => WorkspacesModule),
    UsersModule,
    ConfigModule,
    NotificationsModule,
  ],
  providers: [WorkspaceMembersService],
  exports: [WorkspaceMembersService],
})
export class WorkspaceMembersModule {}
