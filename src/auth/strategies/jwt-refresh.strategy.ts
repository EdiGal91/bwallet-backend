import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { SessionService } from '../services/session.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Check for token in Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Then check cookies
        (request: Request) => {
          const token = request.cookies.refresh_token as string | undefined;
          if (!token) {
            return null;
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'super-refresh-secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // Get refresh token from either cookie or auth header
    let refreshToken = req.cookies.refresh_token as string | undefined;

    if (!refreshToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Refresh token not found');
      }
      refreshToken = authHeader.replace('Bearer ', '').trim();
    }

    // Check if there is a valid session with this refresh token
    const session =
      await this.sessionService.findSessionByUserIdAndRefreshToken(
        payload.sub,
        refreshToken,
      );

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
