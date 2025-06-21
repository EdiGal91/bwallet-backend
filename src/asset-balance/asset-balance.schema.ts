import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Wallet } from '../wallets/schemas/wallet.schema';
import { Token } from '../networks/schemas/token.schema';

export type AssetBalanceDocument = AssetBalance & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: any) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AssetBalance {
  id?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true,
  })
  wallet: Wallet;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Token',
    required: true,
    index: true,
  })
  token: Token;

  @Prop({ default: '0' })
  balance: string; // stored in wei as string for accuracy

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AssetBalanceSchema = SchemaFactory.createForClass(AssetBalance); 