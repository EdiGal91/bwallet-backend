import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type WorkspaceDocument = Workspace & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Workspace {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: User;

  // Keep the members array for backward compatibility during migration
  // This will be removed after migration is complete
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    deprecated: true,
  })
  members?: User[];
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
