import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Workspace } from '../../workspaces/schemas/workspace.schema';

export type WalletDocument = Wallet & Document;

export enum BlockchainType {
  ETHEREUM = 'ethereum',
  BITCOIN = 'bitcoin',
  // More chains can be added in the future
}

export enum WalletType {
  HD_MAIN = 'hd_main', // Main wallet (master)
  HD_DERIVED = 'hd_derived', // Derived from the main wallet
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    transform: (_, ret) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      // Never expose the mnemonic or private keys
      delete ret.mnemonic;
      delete ret.privateKey;
      delete ret.extendedKey;
      return ret;
    },
    /* eslint-enable */
  },
})
export class Wallet {
  id?: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(BlockchainType),
    required: true,
  })
  blockchain: BlockchainType;

  @Prop({
    type: String,
    enum: Object.values(WalletType),
    required: true,
    default: WalletType.HD_MAIN,
  })
  walletType: WalletType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Workspace;

  @Prop({ required: true })
  address: string;

  @Prop()
  publicKey?: string;

  @Prop({
    required: false,
    select: false, // Never select by default for security
  })
  privateKey?: string;

  @Prop({
    required: false,
    select: false, // Never select by default for security
  })
  mnemonic?: string;

  @Prop({
    required: false,
    select: false, // Never select by default for security
  })
  extendedKey?: string;

  @Prop()
  derivationPath?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Wallet' })
  parentWallet?: Wallet;

  @Prop()
  hdIndex?: number;

  @Prop({ default: 0 })
  balance: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
