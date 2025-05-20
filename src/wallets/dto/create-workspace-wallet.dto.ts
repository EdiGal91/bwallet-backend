import { ArrayMinSize, IsArray, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NetworkSelection {
  @IsNotEmpty()
  @IsString()
  networkId: string;

  @IsArray()
  @IsString({ each: true })
  tokenIds: string[];
}

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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NetworkSelection)
  networks: NetworkSelection[];
}
