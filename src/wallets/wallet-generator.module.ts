import { Module } from '@nestjs/common';
import { WalletGeneratorService } from './wallet-generator.service';

@Module({
  providers: [WalletGeneratorService],
  exports: [WalletGeneratorService],
})
export class WalletGeneratorModule {} 