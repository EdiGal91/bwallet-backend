import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletBalanceService } from './wallet-balance.service';

@Module({
  imports: [ConfigModule],
  providers: [WalletBalanceService],
  exports: [WalletBalanceService],
})
export class WalletBalanceModule {} 