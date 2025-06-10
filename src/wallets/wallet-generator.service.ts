import { Injectable, Logger } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as ethers from 'ethers';

export interface GeneratedWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  bip39Mnemonic?: string;
  derivationPath?: string;
  extendedKey?: string;
}

@Injectable()
export class WalletGeneratorService {
  private readonly logger = new Logger(WalletGeneratorService.name);

  /**
   * Generate a new BIP39 mnemonic
   */
  generateBIP39Mnemonic(): string {
     // 128 => 12 words [default]
     // 256 => 24 words
    return bip39.generateMnemonic(256);
  }

  /**
   * Generate an EVM-compatible wallet for a specific network
   * Supports Ethereum and other EVM chains
   */
  generateEVMWallet(networkId: string): GeneratedWallet {
    this.logger.debug(`Generating EVM wallet for network ${networkId}`);

    // Use existing mnemonic or generate a new one
    const mnemonic = bip39.generateMnemonic();

    // Create HD wallet from mnemonic
    const hdNode = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(mnemonic),
    );

    return {
      address: hdNode.address,
      privateKey: hdNode.privateKey,
      bip39Mnemonic: mnemonic,
      publicKey: hdNode.publicKey,
      derivationPath: `m/44'/60'/0'/0/0`, // Standard path for EVM chains
      extendedKey: hdNode.extendedKey,
    };
  }
}
