import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface EmailVerificationTokenDocument
  extends EmailVerificationToken,
    Document {}

@Schema({
  timestamps: true,
  collection: 'email_verification_tokens',
})
export class EmailVerificationToken {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(
  EmailVerificationToken,
);
