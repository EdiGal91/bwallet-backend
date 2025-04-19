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
import { CreateDerivedWalletDto } from './dto/create-derived-wallet.dto';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';
import { UpdateWalletNameDto } from './dto/update-wallet-name.dto';

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

    if (!memberWorkspaceIds.includes(createWalletDto.workspaceId)) {
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
   * Create a derived wallet from a parent wallet
   */
  async createDerivedWallet(
    createDerivedWalletDto: CreateDerivedWalletDto,
    userId: string,
  ): Promise<Wallet> {
    // First get the parent wallet with sensitive data (including mnemonic)
    const parentWallet = await this.findWalletWithSensitiveData(
      createDerivedWalletDto.parentWalletId,
      userId,
    );

    if (parentWallet.walletType !== WalletType.HD_MAIN) {
      throw new Error('Derived wallets can only be created from main wallets');
    }

    // Find the next available HD index
    const walletId = parentWallet.id;
    if (!walletId) {
      throw new Error('Invalid parent wallet ID');
    }
    const nextIndex = await this.getNextHdIndex(walletId);

    const mnemonic = parentWallet.mnemonic;
    if (!mnemonic) {
      throw new Error('Parent wallet mnemonic not found');
    }

    // Generate a derived wallet from the parent's mnemonic
    const generatedWallet = this.walletGeneratorService.generateDerivedWallet(
      parentWallet.blockchain,
      mnemonic,
      nextIndex,
    );

    // Create and save the derived wallet
    const wallet = new this.walletModel({
      name: createDerivedWalletDto.name,
      blockchain: parentWallet.blockchain,
      walletType: WalletType.HD_DERIVED,
      workspace: parentWallet.workspace,
      address: generatedWallet.address,
      publicKey: generatedWallet.publicKey,
      privateKey: generatedWallet.privateKey,
      mnemonic: null, // Don't store mnemonic in derived wallets
      derivationPath: generatedWallet.derivationPath,
      parentWallet: parentWallet.id,
      hdIndex: nextIndex,
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
      .populate('parentWallet', 'id name address')
      .exec();
  }

  /**
   * Find a specific wallet by ID
   */
  async findWalletById(walletId: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletModel
      .findById(walletId)
      .populate('parentWallet', 'id name address')
      .exec();

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
   * Get the next available HD index for a parent wallet
   */
  private async getNextHdIndex(parentWalletId: string): Promise<number> {
    // Find the highest HD index currently in use
    const highestIndexWallet = await this.walletModel
      .findOne({
        parentWallet: parentWalletId,
        walletType: WalletType.HD_DERIVED,
      })
      .sort({ hdIndex: -1 })
      .exec();

    // Start from index 1 if no derived wallets exist yet
    return highestIndexWallet && highestIndexWallet.hdIndex !== undefined
      ? highestIndexWallet.hdIndex + 1
      : 1;
  }

  async updateWalletName(
    id: string,
    updateWalletNameDto: UpdateWalletNameDto,
  ): Promise<Wallet | null> {
    return this.walletModel
      .findByIdAndUpdate(id, { name: updateWalletNameDto.name }, { new: true })
      .exec();
  }
}
