import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Network, NetworkDocument } from './schemas/network.schema';
import { Token, TokenDocument } from './schemas/token.schema';

@Injectable()
export class NetworksService {
  constructor(
    @InjectModel(Network.name)
    private readonly networkModel: Model<NetworkDocument>,
    @InjectModel(Token.name)
    private readonly tokenModel: Model<TokenDocument>,
  ) {}

  /**
   * Find all networks with optional token information
   */
  async findAllWithTokens(
    includeInactive = false,
    includeTokens = false,
  ): Promise<any[]> {
    // Build the network query
    const networkQuery = includeInactive ? {} : { isActive: true };

    // Get all networks
    const networks = await this.networkModel
      .find(networkQuery)
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();

    // If tokens are not requested, return just the networks
    if (!includeTokens) {
      return networks;
    }

    // Get tokens for all networks
    const networksWithTokens = await Promise.all(
      networks.map(async (network) => {
        const tokenQuery = includeInactive
          ? { network: network._id }
          : { network: network._id, isActive: true };

        const tokens = await this.tokenModel
          .find(tokenQuery)
          .sort({ sortOrder: 1, symbol: 1 })
          .lean()
          .exec();

        return {
          ...network,
          tokens,
        };
      }),
    );

    return networksWithTokens;
  }

  /**
   * Find a specific network with its tokens
   */
  async findOneWithTokens(id: string, includeTokens = false): Promise<any> {
    const network = await this.networkModel.findById(id).lean().exec();

    if (!network) {
      throw new NotFoundException(`Network with ID ${id} not found`);
    }

    if (!includeTokens) {
      return network;
    }

    const tokens = await this.tokenModel
      .find({ network: network._id, isActive: true })
      .sort({ sortOrder: 1, symbol: 1 })
      .lean()
      .exec();

    return {
      ...network,
      tokens,
    };
  }
}
