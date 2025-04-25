import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      // Always include tokens for the network
      return await this.networksService.findOneWithTokens(id, true);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }
}
