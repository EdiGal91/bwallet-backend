import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      isEmailVerified: true, // Google emails are pre-verified
    };

    // Find or create user
    const existingUser = await this.usersService.findByEmail(user.email);
    if (existingUser) {
      return existingUser;
    }

    // Create new user if doesn't exist
    return this.usersService.create({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: true,
      // Generate a random password since it won't be used
      password: Math.random().toString(36).slice(-8),
    });
  }
} 