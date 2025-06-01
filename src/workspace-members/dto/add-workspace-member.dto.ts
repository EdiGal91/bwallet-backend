import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class AddWorkspaceMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsEnum(['admin', 'viewer'], {
    message: 'Role must be one of: admin, viewer',
  })
  role?: string;
}
