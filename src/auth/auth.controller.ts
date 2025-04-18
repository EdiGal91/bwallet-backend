import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Get,
  Query,
} from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

// Define request types
interface RequestWithUser extends ExpressRequest {
  user: UserDocument;
}

interface JwtUser {
  userId: string;
  email: string;
}

interface RequestWithJwtUser extends ExpressRequest {
  user: JwtUser;
  cookies: {
    refresh_token?: string;
    access_token?: string;
    [key: string]: string | undefined;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.authService.register(createUserDto);
    // No longer auto login after registration as email verification is required
    return user;
  }

  @Get('verify-email')
  async verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const { user, accessToken, refreshToken } =
        await this.authService.verifyEmail(token);

      // Set auth cookies
      this.setTokenCookies(response, accessToken, refreshToken);

      return {
        success: true,
        message: 'Email successfully verified. You are now logged in.',
        user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Email verification failed',
      };
    }
  }

  // Helper method to set cookies in the controller
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

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(req.user, req, response);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: RequestWithJwtUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userId } = req.user;
    // Get refresh token from cookies
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return this.authService.refreshTokens(userId, refreshToken, response);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RequestWithJwtUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(req.user.userId, response);
  }
}
