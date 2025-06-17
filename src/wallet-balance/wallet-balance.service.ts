import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface EtherscanBalanceResponse {
  status: string;
  message: string;
  result: string;
}

@Injectable()
export class WalletBalanceService {
  private readonly logger = new Logger(WalletBalanceService.name);
  private readonly etherscanApiKey: string;
  private readonly etherscanUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ETHERSCAN_API_KEY');
    const url = this.configService.get<string>('ETHERSCAN_URL');

    if (!apiKey || !url) {
      throw new Error('ETHERSCAN_API_KEY and ETHERSCAN_URL must be defined in environment variables');
    }

    this.etherscanApiKey = apiKey;
    this.etherscanUrl = url;
  }

  async getTokenBalance(
    walletAddress: string,
    tokenContractAddress: string,
    chainId: number,
  ): Promise<string> {
    try {
      const response = await axios.get<EtherscanBalanceResponse>(
        this.etherscanUrl,
        {
          params: {
            chainid: chainId,
            module: 'account',
            action: 'tokenbalance',
            contractaddress: tokenContractAddress,
            address: walletAddress,
            tag: 'latest',
            apikey: this.etherscanApiKey,
          },
        },
      );

      if (response.data.status !== '1') {
        this.logger.error(
          `Failed to fetch token balance: ${response.data.message}`,
        );
        throw new Error(response.data.message);
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(
        `Error fetching token balance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
