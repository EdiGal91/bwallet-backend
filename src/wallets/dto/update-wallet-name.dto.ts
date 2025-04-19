import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateWalletNameDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;
}
