import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(['admin', 'viewer'], {
    message: 'Role must be one of: admin, viewer',
  })
  role: string;
}
