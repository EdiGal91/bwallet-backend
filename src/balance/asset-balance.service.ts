import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AssetBalance, AssetBalanceDocument } from './schemas/asset-balance.schema';
import { Model } from 'mongoose';
import { EtherscanService } from './etherscan.service';
import { NetworksService } from 'src/networks/networks.service';
import { Token } from 'src/networks/schemas/token.schema';

@Injectable()
export class AssetBalanceService {
  constructor(
    @InjectModel(AssetBalance.name)
    private assetBalanceModel: Model<AssetBalanceDocument>,
    private etherscanService: EtherscanService
  ) {}
  async getAssetBalanceByTokenId(walletAddress: string, chainId: number, token: Token): Promise<string> {
    let weiBalance: string;
    if (token.tokenType === 'native') {
      weiBalance = await this.etherscanService.getNativeWeiBalance(walletAddress, chainId);
    } else {
      weiBalance = await this.etherscanService.getTokenWeiBalance(walletAddress, chainId, token.contractAddress!);
    }
    return this.fromWeiToDecimalString(weiBalance, token.decimals);
  }

  private fromWeiToDecimalString(wei: string, decimals: number): string {
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = BigInt(wei) / divisor;
    const fraction = (BigInt(wei) % divisor).toString().padStart(decimals, '0');
    const fractionTrimmed = fraction.replace(/0+$/, '');
    return fractionTrimmed.length > 0 ? `${whole.toString()}.${fractionTrimmed}` : whole.toString();
  }
}
