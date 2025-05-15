import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BlockchainType } from '../schemas/wallet.schema';

const ALLOWED_BLOCKCHAINS: string[] = Object.values(BlockchainType);

export class CreateWorkspaceWalletDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  workspaceId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1, {
    message: `blockchains must include at least one of: ${ALLOWED_BLOCKCHAINS.join(', ')}`,
  })
  @IsEnum(BlockchainType, { each: true })
  blockchains: BlockchainType[];
}
