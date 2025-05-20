import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Workspace } from '../../workspaces/schemas/workspace.schema';
import { Wallet } from '../../wallets/schemas/wallet.schema';
import { Network } from '../../networks/schemas/network.schema';

export type CheckoutSessionDocument = CheckoutSession & Document;

export enum CheckoutSessionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({
  collection: 'checkout_sessions',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, any>) => {
      if (ret._id) {
        ret.id = String(ret._id);
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
    type: MongooseSchema.Types.ObjectId,
    ref: 'Network',
    required: true,
  })
  network: Network;

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

  @Prop({ required: true })
  checkoutUrl: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerName?: string;

  @Prop({ type: Object })
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
