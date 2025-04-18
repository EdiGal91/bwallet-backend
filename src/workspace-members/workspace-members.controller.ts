import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceMembersService } from './workspace-members.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('workspace-members')
@UseGuards(JwtAuthGuard)
export class WorkspaceMembersController {
  constructor(
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('migrate')
  async migrateMembers(@Req() req: RequestWithUser) {
    // Security: Only allow migration from admin emails or in development
    const adminEmails =
      this.configService.get<string>('ADMIN_EMAILS')?.split(',') || [];
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') !== 'production';

    if (!isDevelopment && !adminEmails.includes(req.user.email)) {
      return { success: false, message: 'Unauthorized to perform migration' };
    }

    const count = await this.workspaceMembersService.migrateExistingMembers();
    return { success: true, migratedCount: count };
  }

  @Get('workspaces/:workspaceId/members')
  async getWorkspaceMembers(@Param('workspaceId') workspaceId: string) {
    const members =
      await this.workspaceMembersService.findMembersByWorkspace(workspaceId);
    return members;
  }

  @Post('workspaces/:workspaceId/members')
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @Body() addMemberDto: AddWorkspaceMemberDto,
    @Req() req: RequestWithUser,
  ) {
    const requesterId = req.user.userId;
    return this.workspaceMembersService.addMember(
      workspaceId,
      addMemberDto,
      requesterId,
    );
  }

  @Delete('workspaces/:workspaceId/members/:userId')
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    const requesterId = req.user.userId;
    await this.workspaceMembersService.removeMember(
      workspaceId,
      userId,
      requesterId,
    );
    return { success: true };
  }

  @Put('workspaces/:workspaceId/members/:userId/role')
  async updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body('role') role: string,
    @Req() req: RequestWithUser,
  ) {
    const requesterId = req.user.userId;
    return this.workspaceMembersService.updateMemberRole(
      workspaceId,
      userId,
      role,
      requesterId,
    );
  }
}
