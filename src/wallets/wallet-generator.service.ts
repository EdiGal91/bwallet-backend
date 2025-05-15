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

    // For EVM-compatible chains (Ethereum and Polygon)
    if ([BlockchainType.ETHEREUM, BlockchainType.POLYGON].includes(blockchain)) {
      const hdNode = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(mnemonic),
      );

      return {
        address: hdNode.address,
        privateKey: hdNode.privateKey,
        mnemonic: mnemonic,
        publicKey: hdNode.publicKey,
        derivationPath: `m/44'/60'/0'/0/0`, // Standard path for EVM chains
        extendedKey: hdNode.extendedKey,
        walletType: WalletType.HD_MAIN,
      };
    }

    throw new Error(`Unsupported blockchain type: ${blockchain}`);
  }
}
