import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class AddWorkspaceMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsEnum(['admin', 'member', 'viewer'], {
    message: 'Role must be one of: admin, member, viewer',
  })
  role?: string;
}
