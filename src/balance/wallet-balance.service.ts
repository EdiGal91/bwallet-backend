import { Injectable } from '@nestjs/common';
import { Wallet } from 'src/wallets/schemas/wallet.schema';
import { AssetBalanceService } from './asset-balance.service';

@Injectable()
export class WalletBalanceService {
  constructor(private assetBalanceService: AssetBalanceService) {}

  async getWalletAssetsBalance(wallet: Wallet) {
    const chainId = wallet.networkId.chainId;
    const walletAddress = wallet.address;
    const tokens = wallet.selectedTokens || [];
    const balances = await Promise.all(
      tokens.map(async (token) => {
        const balance = await this.assetBalanceService.getAssetBalanceByTokenId(walletAddress, chainId, token);
        return { token, balance };
      })
    );
    return balances;
  }
}
