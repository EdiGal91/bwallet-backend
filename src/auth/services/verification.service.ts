import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../users/schemas/user.schema';
import { UsersService } from '../../users/users.service';
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument,
} from '../schemas/verification-token.schema';

// Would typically be in its own schema file
export interface VerificationToken {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface VerificationTokenDocument
  extends VerificationToken,
    Document {}

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(EmailVerificationToken.name)
    private emailVerificationTokenModel: Model<EmailVerificationTokenDocument>,
    private usersService: UsersService,
  ) {}

  async generateVerificationToken(userId: string): Promise<string> {
    // Generate a unique token
    const token = uuidv4();

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create a new verification token
    const verificationToken = new this.emailVerificationTokenModel({
      userId,
      token,
      expiresAt,
    });

    await verificationToken.save();

    return token;
  }

  async verifyEmail(token: string): Promise<User> {
    // Find the token
    const verificationToken = await this.emailVerificationTokenModel.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    // Update the user's verification status
    const user = await this.usersService.update(verificationToken.userId, {
      isEmailVerified: true,
    });

    // Delete the token
    await this.emailVerificationTokenModel.deleteOne({
      _id: verificationToken._id,
    });

    return user;
  }
}
