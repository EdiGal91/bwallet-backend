import { Controller, UseGuards, Patch, Body, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestWithUser } from '../common/types/request.types';
import { User } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ): Promise<User> {
    const userId = req.user.userId;
    return this.usersService.update(userId, updateUserDto);
  }
}
