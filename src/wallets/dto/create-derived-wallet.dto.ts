import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDerivedWalletDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  parentWalletId: string;
}
