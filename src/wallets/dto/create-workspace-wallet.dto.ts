import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceWalletDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  workspaceId: string;
}
