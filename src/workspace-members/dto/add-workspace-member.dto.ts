import { IsNotEmpty, IsEnum } from 'class-validator';

export class AddWorkspaceMemberDto {
  @IsNotEmpty()
  userId: string;

  @IsEnum(['admin', 'viewer', 'owner'], {
    message: 'Role must be one of: admin, viewer, owner',
  })
  role: string;
}
