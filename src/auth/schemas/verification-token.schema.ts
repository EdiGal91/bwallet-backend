import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface VerificationTokenDocument
  extends VerificationToken,
    Document {}

@Schema({
  timestamps: true,
  collection: 'verification_tokens',
})
export class VerificationToken {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const VerificationTokenSchema =
  SchemaFactory.createForClass(VerificationToken);
