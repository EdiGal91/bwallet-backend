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
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/schemas/user.schema';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RequestWithUser, RequestWithUserDocument } from '../common/types/request.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
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
      const { user } = await this.authService.verifyEmail(token, response);

      return {
        success: true,
        message: 'Email successfully verified. You are now logged in.',
        user,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Email verification failed',
      };
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: RequestWithUserDocument,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(req.user, req, response);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userId } = req.user;
    // Get refresh token from cookies
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    await this.authService.refreshTokens(userId, refreshToken, response);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(req.user.userId, response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(
    @Req() req: RequestWithUser,
  ): Promise<{ user: User }> {
    const user = await this.authService.getCurrentUser(req.user.userId);
    return { user };
  }
}
