import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { WorkspaceWallet } from './workspace-wallet.schema';
import { Network } from '../../networks/schemas/network.schema';
import { Token } from '../../networks/schemas/token.schema';

export type WalletDocument = Wallet & Document;

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
      return ret;
    },
    /* eslint-enable */
  },
})
export class Wallet {
  id?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Network',
    required: true,
  })
  networkId: Network;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'WorkspaceWallet',
    required: true,
  })
  workspaceWallet: WorkspaceWallet;

  @Prop({ required: true })
  address: string;

  @Prop()
  publicKey?: string;

  @Prop()
  derivationPath?: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop([{
    type: MongooseSchema.Types.ObjectId,
    ref: 'Token'
  }])
  selectedTokenIds: Token[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
