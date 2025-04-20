import { Injectable, Logger } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as ethers from 'ethers';
import { BlockchainType, WalletType } from './schemas/wallet.schema';

export interface GeneratedWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic?: string;
  derivationPath?: string;
  extendedKey?: string;
  walletType: WalletType;
}

@Injectable()
export class WalletGeneratorService {
  private readonly logger = new Logger(WalletGeneratorService.name);

  /**
   * Generate a main wallet for a specific blockchain
   */
  generateMainWallet(blockchain: BlockchainType) {
    this.logger.debug(`Generating main wallet for ${blockchain as string}`);

    // Generate a random mnemonic (recovery phrase)
    const mnemonic = bip39.generateMnemonic();

    // For Ethereum wallets
    if (blockchain === BlockchainType.ETHEREUM) {
      // Create an Ethereum wallet from the mnemonic
      const hdNode = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(mnemonic),
      );

      return {
        address: hdNode.address,
        privateKey: hdNode.privateKey,
        mnemonic: mnemonic,
        publicKey: hdNode.publicKey,
        derivationPath: `m/44'/60'/0'/0/0`, // Default path for main wallet
        extendedKey: hdNode.extendedKey,
      };
    }

    // For Bitcoin wallets (placeholder for future implementation)
    if (blockchain === BlockchainType.BITCOIN) {
      throw new Error('Bitcoin wallet generation not yet implemented');
    }

    throw new Error(`Unsupported blockchain type: ${blockchain as string}`);
  }
}
