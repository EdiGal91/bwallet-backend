import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Network } from './network.schema';

export enum TokenType {
  NATIVE = 'native', // Native cryptocurrency of the blockchain (BTC, ETH, etc.)
  CONTRACT = 'contract', // Token created via a smart contract (ERC-20, etc.)
}

export type TokenDocument = Token & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    transform: (_, ret: any) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
    /* eslint-enable */
  },
})
export class Token {
  id?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string; // e.g., USDT, USDC

  @Prop({ required: true })
  displayName: string;

  @Prop()
  iconUrl?: string;

  @Prop({
    type: String,
    enum: Object.values(TokenType),
    required: true,
    default: TokenType.CONTRACT,
  })
  tokenType: TokenType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Network',
    required: true,
  })
  network: Network;

  @Prop() // Only required for contract tokens
  contractAddress?: string;

  @Prop({ required: true })
  decimals: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

// Create a compound index to ensure tokens are unique per network
// For native tokens, the symbol+network should be unique
// For contract tokens, the contractAddress+network should be unique
TokenSchema.index(
  { network: 1, tokenType: 1, symbol: 1 },
  {
    unique: true,
    partialFilterExpression: { tokenType: TokenType.NATIVE },
  },
);

TokenSchema.index(
  { network: 1, contractAddress: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tokenType: TokenType.CONTRACT,
      contractAddress: { $exists: true, $ne: '' },
    },
  },
);
