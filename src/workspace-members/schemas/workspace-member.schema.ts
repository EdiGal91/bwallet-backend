import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Workspace } from '../../workspaces/schemas/workspace.schema';

export type WorkspaceMemberDocument = WorkspaceMember & Document;

@Schema({
  timestamps: true,
  collection: 'workspace_members',
  toJSON: {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
    /* eslint-enable */
  },
})
export class WorkspaceMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Workspace;

  @Prop({
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    default: 'member',
  })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

export const WorkspaceMemberSchema =
  SchemaFactory.createForClass(WorkspaceMember);

// Create indexes for efficient querying
WorkspaceMemberSchema.index({ user: 1 }); // Fast lookup by user
WorkspaceMemberSchema.index({ workspace: 1 }); // Fast lookup by workspace
WorkspaceMemberSchema.index({ user: 1, workspace: 1 }, { unique: true }); // Ensure unique memberships
