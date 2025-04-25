import { Controller, Get, UseGuards } from '@nestjs/common';
import { NetworksService } from './networks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('networks')
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Get()
  async findAll() {
    // Always include tokens for networks
    return await this.networksService.findAllWithTokens(false, true);
  }
}
