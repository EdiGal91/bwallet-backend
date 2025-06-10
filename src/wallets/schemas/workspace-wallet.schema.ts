import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Workspace } from '../../workspaces/schemas/workspace.schema';

export type WorkspaceWalletDocument = WorkspaceWallet & Document;

@Schema({
  collection: 'workspace_wallets',
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
export class WorkspaceWallet {
  id?: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Workspace;

  @Prop({ required: true })
  accountIndex: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WorkspaceWalletSchema =
  SchemaFactory.createForClass(WorkspaceWallet);

// Create a compound index on workspace and accountIndex to ensure uniqueness
WorkspaceWalletSchema.index({ workspace: 1, accountIndex: 1 }, { unique: true });
