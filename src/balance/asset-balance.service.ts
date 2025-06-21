import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AssetBalance, AssetBalanceDocument } from './schemas/asset-balance.schema';
import { Model } from 'mongoose';

@Injectable()
export class AssetBalanceService {
  constructor(
    @InjectModel(AssetBalance.name)
    private assetBalanceModel: Model<AssetBalanceDocument>,
  ) {}
} 