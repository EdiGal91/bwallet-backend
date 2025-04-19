import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './schemas/wallet.schema';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateDerivedWalletDto } from './dto/create-derived-wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { UpdateWalletNameDto } from './dto/update-wallet-name.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
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
    return this.walletsService.createMainWallet(
      createWalletDto,
      req.user.userId,
    );
  }

  @Post('derived')
  async createDerivedWallet(
    @Body() createDerivedWalletDto: CreateDerivedWalletDto,
    @Req() req: RequestWithUser,
  ) {
    return this.walletsService.createDerivedWallet(
      createDerivedWalletDto,
      req.user.userId,
    );
  }

  @Get('workspace/:workspaceId')
  async findWalletsByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.walletsService.findWalletsByWorkspace(
      workspaceId,
      req.user.userId,
    );
  }

  @Get(':id')
  async findWalletById(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.walletsService.findWalletById(id, req.user.userId);
  }

  @Patch(':id/name')
  async updateWalletName(
    @Param('id') id: string,
    @Body() updateWalletNameDto: UpdateWalletNameDto,
    @Req() req: RequestWithUser,
  ): Promise<Wallet> {
    await this.walletsService.findWalletById(id, req.user.userId);
    const updatedWallet = await this.walletsService.updateWalletName(
      id,
      updateWalletNameDto,
    );
    if (!updatedWallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }
    return updatedWallet;
  }
}
