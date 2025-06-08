import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({ 
  timestamps: true, 
  collection: 'workspace_invitations',
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
export class WorkspaceInvitation extends Document {
  declare id?: string;

  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true })
  workspace: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  inviter: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'viewer'] })
  role: string;

  @Prop({ enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const WorkspaceInvitationSchema = SchemaFactory.createForClass(WorkspaceInvitation); 