import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Session, SessionDocument } from '../schemas/session.schema';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    expiresIn: number,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<Session> {
    // Hash the refresh token
    const hashedToken = await bcrypt.hash(refreshToken, 10);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + expiresIn * 1000);

    // Create and save the session
    const session = new this.sessionModel({
      userId,
      refreshToken: hashedToken,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return session.save();
  }

  async findSessionByUserIdAndRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<SessionDocument | null> {
    // Find active sessions for this user
    const sessions = await this.sessionModel
      .find({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }, // Not expired
      })
      .exec();

    // Check each session for matching refresh token
    for (const session of sessions) {
      const isValid = await session.verifyRefreshToken(refreshToken);
      if (isValid) {
        return session;
      }
    }

    return null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionModel.findByIdAndUpdate(sessionId, { isRevoked: true });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionModel.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}
