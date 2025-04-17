import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as bcrypt from 'bcrypt';

export interface SessionDocument extends Session, Document {
  verifyRefreshToken(refreshToken: string): Promise<boolean>;
  id: string;
}

@Schema({
  timestamps: true,
})
export class Session {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop()
  userAgent: string;

  @Prop()
  ipAddress: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Add a method to verify refresh token
SessionSchema.methods.verifyRefreshToken = async function (
  this: SessionDocument,
  refreshToken: string,
): Promise<boolean> {
  return bcrypt.compare(refreshToken, this.refreshToken);
};
