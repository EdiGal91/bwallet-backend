import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWalletDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  workspaceId: string;

  @IsNotEmpty()
  @IsString()
  networkId: string;
}
