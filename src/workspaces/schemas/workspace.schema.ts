import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WorkspaceDocument = Workspace & Document;

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
      // Never expose sensitive data
      delete ret.bip39Mnemonic;
      return ret;
    },
  },
})
export class Workspace {
  id?: string; // Add virtual id property to match MongoDB behavior

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    select: false, // Never select by default for security
  })
  // BTC, ETH/EVM, TRON, Solana
  bip39Mnemonic?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
