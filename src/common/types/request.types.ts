import { Request } from 'express';
import { UserDocument } from '../../users/schemas/user.schema';

// Used with jwt strategy
export interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
  };
}

// Used with local strategy
export interface RequestWithUserDocument extends Request {
  user: UserDocument;
} 