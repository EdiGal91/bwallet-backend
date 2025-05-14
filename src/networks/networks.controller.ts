import { Controller, Get, UseGuards } from '@nestjs/common';
import { NetworksService } from './networks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NetworkWithTokens } from './dto/network-with-tokens.dto';

@UseGuards(JwtAuthGuard)
@Controller('networks')
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Get()
  async findAll(): Promise<NetworkWithTokens[]> {
    // Always include tokens for networks
    const networks = await this.networksService.findAllWithTokens(false, true);
    return networks;
  }
}
