import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SessionService } from './services/session.service';
import { VerificationService } from './services/verification.service';
import { NotificationsService } from '../notifications/services/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionService: SessionService,
    private verificationService: VerificationService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    // Create the user
    const user = await this.usersService.create(createUserDto);

    // Generate verification token
    const token = await this.verificationService.generateVerificationToken(
      (user as UserDocument).id,
    );

    // Create verification link that points to the frontend
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const verificationLink = `${frontendUrl}/verify?token=${token}`;

    // Send verification notification
    await this.notificationsService.sendVerificationNotification(
      (user as UserDocument).id,
      user.email,
      verificationLink,
    );

    return user;
  }

  async verifyEmail(
    token: string,
    response?: Response,
  ): Promise<{ user: User }> {
    // Verify the email and get the user
    const user = await this.verificationService.verifyEmail(token);

    // Send welcome notification after successful verification
    await this.notificationsService.sendWelcomeNotification(
      (user as UserDocument).id,
      user.email,
    );

    // Generate tokens for automatic login
    const payload: JwtPayload = {
      email: user.email,
      sub: (user as UserDocument).id,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Create session
    await this.sessionService.createSession(
      (user as UserDocument).id,
      refreshToken,
      7 * 24 * 60 * 60, // 7 days in seconds
    );

    // Set cookies if response object is provided
    if (response) {
      this.setTokenCookies(response, accessToken, refreshToken);
    }

    // Return user without exposing the tokens
    return { user };
  }

  async login(user: UserDocument, request?: Request, response?: Response) {
    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in',
      );
    }

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Create session with optional request metadata
    await this.sessionService.createSession(
      user.id,
      refreshToken,
      7 * 24 * 60 * 60, // 7 days in seconds
      request?.headers['user-agent'],
      request?.ip,
    );

    // Set cookies if response object is provided
    if (response) {
      this.setTokenCookies(response, accessToken, refreshToken);
    }

    // Return user data only, without exposing tokens
    return { user };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    response?: Response,
  ) {
    // Validate refresh token and get session
    const session =
      await this.sessionService.findSessionByUserIdAndRefreshToken(
        userId,
        refreshToken,
      );

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.usersService.findById(userId);

    // Generate new tokens
    const payload: JwtPayload = { email: user.email, sub: userId };

    // Revoke old session
    await this.sessionService.revokeSession(session.id);

    // Create new session
    const newRefreshToken = await this.generateRefreshToken(payload);
    await this.sessionService.createSession(
      userId,
      newRefreshToken,
      7 * 24 * 60 * 60, // 7 days in seconds
    );

    const newAccessToken = await this.generateAccessToken(payload);

    // Set cookies if response object is provided
    if (response) {
      this.setTokenCookies(response, newAccessToken, newRefreshToken);
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, response?: Response) {
    await this.sessionService.revokeAllUserSessions(userId);

    // Clear cookies if response object is provided
    if (response) {
      this.clearTokenCookies(response);
    }

    return { success: true };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_SECRET') || 'super-secret-key',
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'super-refresh-secret-key',
      expiresIn: '7d',
    });
  }

  private setTokenCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    // Set access token as HTTP-only cookie
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });

    // Set refresh token as HTTP-only cookie
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh', // Only sent to refresh endpoint
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
  }

  private clearTokenCookies(response: Response): void {
    response.cookie('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });

    response.cookie('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 0,
    });
  }

  async getCurrentUser(userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }
}
