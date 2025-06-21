// bwallet-backend/src/balance/etherscan.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface EtherscanResponse {
  status: '0' | '1';
  message: string;
  result: string;                // raw units, still ⬆18 decimals
}

@Injectable()
export class EtherscanService {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly base = 'https://api.etherscan.io/v2/api';

  constructor(private readonly cfg: ConfigService) {
    this.apiKey = this.cfg.get<string>('ETHERSCAN_API_KEY', '');
    if (!this.apiKey) {
      throw new Error('Missing ETHERSCAN_API_KEY in environment');
    }
    this.http = axios.create({ baseURL: this.base, timeout: 10_000 });
  }

  /**
   * Returns the ERC-20 balance of `contractAddress` for `address`
   * on the chain identified by `chainId`.
   *
   * @note Etherscan V2 parameter is **chainid** (all lowercase).
   * @see https://docs.etherscan.io/etherscan-v2/api-endpoints/tokens#get-erc20-token-account-balance-for-tokencontractaddress
   */
  async getTokenWeiBalance(
    address: string,
    chainId: number,
    contractAddress: string,
  ): Promise<string> {
    const qs = new URLSearchParams({
      module: 'account',
      action: 'tokenbalance',
      chainid: chainId.toString(),           // ← correct param name
      contractaddress: contractAddress,
      address,
      tag: 'latest',
      apikey: this.apiKey,
    });

    try {
      const { data } = await this.http.get<EtherscanResponse>(`?${qs}`);
      if (data.status !== '1') {
        throw new Error(data.message || 'Etherscan returned error');
      }
      return data.result;                    // still needs /10**decimals in caller
    } catch (err: any) {
      throw new HttpException(
        `Etherscan error: ${err.message ?? 'unknown'}`,
        err.response?.status ?? 502,
      );
    }
  }
}
