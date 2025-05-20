import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  workspaceId: string;

  @IsNotEmpty()
  @IsString()
  walletId: string;

  @IsNotEmpty()
  @IsString()
  networkId: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsString()
  redirectUrl: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
