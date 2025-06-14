import { Injectable, Logger } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as ethers from 'ethers';

export interface GeneratedWallet {
  address: string;
  publicKey: string;
  derivationPath?: string;
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
   * Generate derivation path based on network name and account/address indices
   * Following BIP standard: m/purpose'/coin_type'/account_index'/change/address_index
   * @param networkName - Name of the network
   * @param accountIndex - Account index for derivation (default: 0)
   * @param addressIndex - Address index for derivation (default: 0)
   * @param purpose - BIP purpose number (default: 44 for BIP44)
   * @throws Error if network's coin type is not defined
   */
  private generateDerivationPath(
    networkName: string, 
    accountIndex: number = 0,
    addressIndex: number = 0,
    purpose: number = 44
  ): string {
    const coinTypes: Record<string, number> = {
      'ethereum': 60,  // ETH and EVM chains
      'polygon': 60,
    };

    const coinType = coinTypes[networkName.toLowerCase()];
    if (coinType === undefined) {
      throw new Error(`Coin type not defined for network: ${networkName}`);
    }

    return `m/${purpose}'/${coinType}'/${accountIndex}'/0/${addressIndex}`;
  }

  generateWallet(mnemonic: string, networkName: string, accountIndex: number, addressIndex): GeneratedWallet {
    if(networkName==='ethereum') {
      const derivationPath = this.generateDerivationPath(networkName, accountIndex, addressIndex);
      const result = this.generateEthereumWallet(mnemonic, derivationPath);
      return result;
    }
    if(networkName==='polygon') {
      const derivationPath = this.generateDerivationPath(networkName, accountIndex, addressIndex);
      return this.generateEthereumWallet(mnemonic, derivationPath);
    }
    // Add more network types here as needed
    throw new Error(`Unsupported network type: ${networkName}`);
  }

  /**
   * Generate an EVM-compatible wallet for a specific network
   * Supports Ethereum and other EVM chains
   */
  private generateEthereumWallet(mnemonic: string, derivationPath: string): GeneratedWallet {
    const hdNode = ethers.HDNodeWallet.fromPhrase(
      mnemonic,
      undefined,
      derivationPath
    );

    return {
      address: hdNode.address,
      publicKey: hdNode.publicKey,
      derivationPath,
    };
  }
}
