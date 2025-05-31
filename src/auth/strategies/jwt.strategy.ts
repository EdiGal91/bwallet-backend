import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RequestWithUser } from 'src/common/types/request.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Check for token in Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Then check cookies
        (request: Request) => {
          const token = request.cookies.access_token as string | undefined;
          if (!token) {
            return null;
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-key',
    });
  }

  validate(payload: JwtPayload): RequestWithUser['user'] {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
