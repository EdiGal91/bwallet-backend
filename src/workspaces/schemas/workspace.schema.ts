import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type WorkspaceDocument = Workspace & Document;

@Schema({
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
export class Workspace {
  id?: string; // Add virtual id property to match MongoDB behavior

  @Prop({ required: true })
  name: string;

  // Keep the members array for backward compatibility during migration
  // This will be removed after migration is complete
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    deprecated: true,
  })
  members?: User[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
