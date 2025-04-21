import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument, WalletType } from './schemas/wallet.schema';
import { WalletGeneratorService } from './wallet-generator.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    private readonly walletGeneratorService: WalletGeneratorService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  /**
   * Create a new main wallet for a workspace
   */
  async createMainWallet(
    createWalletDto: CreateWalletDto,
    userId: string,
  ): Promise<Wallet> {
    // First check if the workspace exists
    const workspace = await this.workspacesService.findById(
      createWalletDto.workspaceId,
    );

    if (!workspace) {
      throw new NotFoundException(
        `Workspace with ID ${createWalletDto.workspaceId} not found`,
      );
    }

    // Check if user has access to the workspace using member service
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    const hasAccessToWorkspace = memberWorkspaceIds.includes(
      createWalletDto.workspaceId,
    );
    if (!hasAccessToWorkspace) {
      throw new UnauthorizedException(
        `You don't have access to the workspace with ID ${createWalletDto.workspaceId}`,
      );
    }

    // Generate a new wallet for the specified blockchain
    const generatedWallet = this.walletGeneratorService.generateMainWallet(
      createWalletDto.blockchain,
    );

    // Create and save the wallet
    const wallet = new this.walletModel({
      name: createWalletDto.name,
      blockchain: createWalletDto.blockchain,
      walletType: WalletType.HD_MAIN,
      workspace: createWalletDto.workspaceId,
      address: generatedWallet.address,
      publicKey: generatedWallet.publicKey,
      privateKey: generatedWallet.privateKey,
      mnemonic: generatedWallet.mnemonic,
      derivationPath: generatedWallet.derivationPath,
      extendedKey: generatedWallet.extendedKey,
      balance: 0,
    });

    return wallet.save();
  }

  /**
   * Find all wallets for a specific workspace
   */
  async findWalletsByWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<Wallet[]> {
    // First check if the workspace exists
    const workspace = await this.workspacesService.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if user has access to the workspace using member service
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    if (!memberWorkspaceIds.includes(workspaceId)) {
      throw new UnauthorizedException(
        `You don't have access to the workspace with ID ${workspaceId}`,
      );
    }

    // Find all wallets for this workspace
    return this.walletModel
      .find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find a specific wallet by ID
   */
  async findWalletById(walletId: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletModel.findById(walletId).exec();

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    // Get the workspace ID safely using string conversion
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const workspaceId =
      typeof wallet.workspace === 'string'
        ? wallet.workspace
        : (wallet.workspace as any).id || (wallet.workspace as any)._id;
    /* eslint-enable */

    // Check if user has access to the workspace using member service
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    if (!memberWorkspaceIds.includes(workspaceId)) {
      throw new UnauthorizedException(
        `You don't have access to the wallet with ID ${walletId}`,
      );
    }

    return wallet;
  }

  /**
   * Get wallet with sensitive data (for internal use only)
   */
  private async findWalletWithSensitiveData(
    walletId: string,
    userId: string,
  ): Promise<Wallet> {
    // First get the wallet with standard data to check permissions
    await this.findWalletById(walletId, userId);

    // Then get the full wallet with sensitive data
    const wallet = await this.walletModel
      .findById(walletId)
      .select('+privateKey +mnemonic +extendedKey')
      .exec();

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    return wallet;
  }

  /**
   * Update wallet name
   */
  async updateWalletName(
    id: string,
    name: string,
    userId: string,
  ): Promise<Wallet> {
    // First check if the wallet exists and user has access to it
    await this.findWalletById(id, userId);

    // Update the wallet name
    const updatedWallet = await this.walletModel
      .findByIdAndUpdate(id, { name }, { new: true })
      .exec();

    if (!updatedWallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return updatedWallet;
  }
}
