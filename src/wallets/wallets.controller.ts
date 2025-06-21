import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Put,
  Query,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './schemas/wallet.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateWalletNameDto } from './dto/update-wallet-name.dto';
import { CreateWorkspaceWalletDto } from './dto/create-workspace-wallet.dto';
import { WorkspaceWallet } from './schemas/workspace-wallet.schema';
import { RequestWithUser } from '../common/types/request.types';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  async createWorkspaceWallet(
    @Body() createWorkspaceWalletDto: CreateWorkspaceWalletDto,
    @Req() req: RequestWithUser,
  ): Promise<{ workspaceWallet: WorkspaceWallet; wallets: Wallet[] }> {
    return this.walletsService.createWorkspaceWallet(
      createWorkspaceWalletDto,
      req.user.userId,
    );
  }

  @Get()
  async findWorkspaceWallets(
    @Req() req: RequestWithUser,
  ): Promise<{ data: Array<WorkspaceWallet & { wallets: Wallet[]; userRole?: string }> }> {
    const result = await this.walletsService.findAllWorkspaceWallets(req.user.userId);
    return result
  }

  @Get(':id')
  async findWorkspaceWalletById(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<WorkspaceWallet> {
    return this.walletsService.findWorkspaceWalletById(id, req.user.userId);
  }

  @Put(':id/name')
  async updateWorkspaceWalletName(
    @Param('id') id: string,
    @Body() updateWalletNameDto: UpdateWalletNameDto,
    @Req() req: RequestWithUser,
  ): Promise<WorkspaceWallet> {
    return this.walletsService.updateWorkspaceWalletName(
      id,
      updateWalletNameDto.name,
      req.user.userId,
    );
  }
}
