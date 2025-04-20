import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './schemas/wallet.schema';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { UpdateWalletNameDto } from './dto/update-wallet-name.dto';

interface RequestWithUser extends Request {
  user: {
    _id: string;
    email: string;
  };
}

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  async createWallet(
    @Body() createWalletDto: CreateWalletDto,
    @Req() req: RequestWithUser,
  ) {
    return this.walletsService.createMainWallet(createWalletDto, req.user._id);
  }

  @Get('workspace/:workspaceId')
  async findWalletsByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.walletsService.findWalletsByWorkspace(
      workspaceId,
      req.user._id,
    );
  }

  @Get(':id')
  async findWalletById(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.walletsService.findWalletById(id, req.user._id);
  }

  @Put(':id/name')
  async updateWalletName(
    @Param('id') id: string,
    @Body() updateWalletNameDto: UpdateWalletNameDto,
    @Req() req: RequestWithUser,
  ): Promise<Wallet> {
    return this.walletsService.updateWalletName(
      id,
      updateWalletNameDto.name,
      req.user._id,
    );
  }
}
