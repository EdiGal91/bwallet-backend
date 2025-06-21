import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AssetBalance,
  AssetBalanceSchema,
} from './schemas/asset-balance.schema';
import { WalletBalanceService } from './wallet-balance.service';
import { AssetBalanceService } from './asset-balance.service';
import { ConfigModule } from '@nestjs/config';
import { EtherscanService } from './etherscan.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AssetBalance.name, schema: AssetBalanceSchema },
    ]),
  ],
  providers: [WalletBalanceService, AssetBalanceService, EtherscanService],
  exports: [WalletBalanceService, AssetBalanceService, EtherscanService],
})
export class BalanceModule {} 