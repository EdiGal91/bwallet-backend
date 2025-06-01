import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspaceMembersService } from './workspace-members.service';
import {
  WorkspaceMember,
  WorkspaceMemberSchema,
} from './schemas/workspace-member.schema';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceMember.name, schema: WorkspaceMemberSchema },
    ]),
    forwardRef(() => WorkspacesModule),
    UsersModule,
    ConfigModule,
  ],
  providers: [WorkspaceMembersService],
  exports: [WorkspaceMembersService],
})
export class WorkspaceMembersModule {}
