import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Workspace } from '../../workspaces/schemas/workspace.schema';
import { Wallet } from '../../wallets/schemas/wallet.schema';
import { BlockchainType } from '../../wallets/schemas/wallet.schema';

export type CheckoutSessionDocument = CheckoutSession & Document;

export enum CheckoutSessionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class CheckoutSession {
  id?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Workspace;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallet: Wallet;

  @Prop({
    type: String,
    enum: Object.values(BlockchainType),
    required: true,
  })
  blockchain: BlockchainType;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    type: String,
    enum: Object.values(CheckoutSessionStatus),
    default: CheckoutSessionStatus.PENDING,
  })
  status: CheckoutSessionStatus;

  @Prop({ required: true })
  redirectUrl: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerName?: string;

  @Prop()
  metadata?: Record<string, any>;

  @Prop({ required: true })
  token: string;

  @Prop()
  expiresAt: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const CheckoutSessionSchema =
  SchemaFactory.createForClass(CheckoutSession);

// Add unique index for token
CheckoutSessionSchema.index({ token: 1 }, { unique: true });
