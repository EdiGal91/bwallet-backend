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
  hdIndex?: number;
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

  /**
   * Generate a derived wallet from a mnemonic and index
   */
  generateDerivedWallet(
    blockchain: BlockchainType,
    mnemonic: string,
    index: number,
  ) {
    this.logger.debug(
      `Generating derived wallet for ${blockchain as string} with index ${index}`,
    );

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic provided');
    }

    // For Ethereum wallets
    if (blockchain === BlockchainType.ETHEREUM) {
      // Create HD wallet from mnemonic
      const hdNode = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(mnemonic),
      );

      // Derive the path based on index (m/44'/60'/0'/0/index)
      const derivedPath = `m/44'/60'/0'/0/${index}`;
      const derivedWallet = hdNode.derivePath(derivedPath);

      return {
        address: derivedWallet.address,
        privateKey: derivedWallet.privateKey,
        derivationPath: derivedPath,
        hdIndex: index,
        publicKey: derivedWallet.publicKey,
        extendedKey: derivedWallet.extendedKey,
      };
    }

    // For Bitcoin wallets (placeholder for future implementation)
    if (blockchain === BlockchainType.BITCOIN) {
      throw new Error('Bitcoin derived wallet generation not yet implemented');
    }

    throw new Error(`Unsupported blockchain type: ${blockchain as string}`);
  }
}
