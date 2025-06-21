import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetBalance, AssetBalanceSchema } from './asset-balance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssetBalance.name, schema: AssetBalanceSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class AssetBalanceModule {}
