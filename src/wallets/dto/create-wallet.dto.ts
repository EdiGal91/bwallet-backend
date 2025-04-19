import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BlockchainType } from '../schemas/wallet.schema';

export class CreateWalletDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  workspaceId: string;

  @IsNotEmpty()
  @IsEnum(BlockchainType)
  blockchain: BlockchainType;
}
