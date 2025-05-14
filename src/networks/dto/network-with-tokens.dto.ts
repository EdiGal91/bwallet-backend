import { Network } from '../schemas/network.schema';
import { Token } from '../schemas/token.schema';

/**
 * Interface representing a Network with its associated Tokens
 */
export interface NetworkWithTokens extends Omit<Network, 'tokens'> {
  tokens: Token[];
}
