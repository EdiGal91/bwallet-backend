import { Injectable } from '@nestjs/common';
import { Wallet } from 'src/wallets/schemas/wallet.schema';

@Injectable()
export class WalletBalanceService {
  async getWalletAssetsBalance(wallet: Wallet) {
    
    
  }
}
