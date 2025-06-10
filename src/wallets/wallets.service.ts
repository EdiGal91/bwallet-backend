import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { WalletGeneratorService } from './wallet-generator.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceMembersService } from '../workspace-members/workspace-members.service';
import {
  WorkspaceWallet,
  WorkspaceWalletDocument,
} from './schemas/workspace-wallet.schema';
import { CreateWorkspaceWalletDto } from './dto/create-workspace-wallet.dto';
import { NetworksService } from '../networks/networks.service';
import { NetworkWithTokens } from '../networks/dto/network-with-tokens.dto';
import { Token } from '../networks/schemas/token.schema';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WorkspaceWallet.name)
    private readonly workspaceWalletModel: Model<WorkspaceWalletDocument>,
    private readonly walletGeneratorService: WalletGeneratorService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly networksService: NetworksService,
  ) {}

  /**
   * Create a new workspace wallet with associated blockchain wallets
   */
  async createWorkspaceWallet(
    createWorkspaceWalletDto: CreateWorkspaceWalletDto,
    userId: string,
  ): Promise<{ workspaceWallet: WorkspaceWallet; wallets: Wallet[] }> {
    // First check if the workspace exists
    const workspace = await this.workspacesService.findById(
      createWorkspaceWalletDto.workspaceId,
    );

    if (!workspace) {
      throw new NotFoundException(
        `Workspace with ID ${createWorkspaceWalletDto.workspaceId} not found`,
      );
    }

    // Check if user has access to the workspace using member service
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    const hasAccessToWorkspace = memberWorkspaceIds.includes(
      createWorkspaceWalletDto.workspaceId,
    );
    if (!hasAccessToWorkspace) {
      throw new UnauthorizedException(
        `You don't have access to the workspace with ID ${createWorkspaceWalletDto.workspaceId}`,
      );
    }

    // Create the workspace wallet
    const workspaceMnemonic = this.walletGeneratorService.generateBIP39Mnemonic();
    
    const workspaceWallet = new this.workspaceWalletModel({
      name: createWorkspaceWalletDto.name,
      workspace: workspace.id,
      bip39Mnemonic: workspaceMnemonic,
    });

    await workspaceWallet.save();

    const wallets: Wallet[] = [];

    for (const network of createWorkspaceWalletDto.networks) {
      // Generate a new wallet for the specified network using the workspace mnemonic
      const generatedWallet = this.walletGeneratorService.generateEVMWallet(network.networkId, workspaceMnemonic);

      // Create and save the wallet
      const wallet = new this.walletModel({
        networkId: network.networkId,
        workspaceWallet: workspaceWallet.id,
        address: generatedWallet.address,
        publicKey: generatedWallet.publicKey,
        privateKey: generatedWallet.privateKey,
        derivationPath: generatedWallet.derivationPath,
        extendedKey: generatedWallet.extendedKey,
        balance: 0,
        selectedTokenIds: network.tokenIds,
      });

      const savedWallet = await wallet.save();
      wallets.push(savedWallet);
    }

    return { workspaceWallet, wallets };
  }

  /**
   * Find wallet by ID without any access checks
   * PUBLIC API - No authorization required
   * Used for checkout sessions and other public endpoints
   */
  async getWalletWithoutAccessCheck(walletId: string): Promise<Wallet | null> {
    const wallet = await this.walletModel.findById(walletId).exec();
    return wallet;
  }

  /**
   * Find wallet by ID and verify user has access to it
   * PROTECTED API - Requires authorization
   * Used for admin/user wallet management
   */
  async findWorkspaceWalletById(
    walletId: string,
    userId: string,
  ): Promise<WorkspaceWallet & { wallets: Array<Wallet & { network?: NetworkWithTokens; selectedTokens: Token[] }> }> {
    const wallet = await this.workspaceWalletModel.findById(walletId).exec();

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    const workspaceId = String(wallet.workspace);

    // Check if user has access to the workspace using member service
    const memberWorkspaceIds =
      await this.workspaceMembersService.findWorkspacesByUser(userId);

    if (!memberWorkspaceIds.includes(workspaceId)) {
      throw new UnauthorizedException(
        `You don't have access to the wallet with ID ${walletId}`,
      );
    }

    // Get all networks with their tokens
    const networksWithTokens = await this.networksService.findAllWithTokens(false, true);

    // Get all blockchain wallets for this workspace wallet
    const wallets = await this.walletModel
      .find({ workspaceWallet: walletId })
      .exec();

    // For each wallet, add the network and token information
    const walletsWithDetails = wallets.map(wallet => {
      const network = networksWithTokens.find(n => n.id === String(wallet.networkId));
      const selectedTokens = network?.tokens.filter(token => 
        wallet.selectedTokenIds.some(id => String(id) === String(token.id))
      ) || [];

      return {
        ...wallet.toJSON(),
        network,
        selectedTokens,
      };
    });

    return {
      ...wallet.toJSON(),
      wallets: walletsWithDetails,
    };
  }

  /**
   * Update wallet name
   */
  async updateWorkspaceWalletName(
    id: string,
    name: string,
    userId: string,
  ): Promise<WorkspaceWallet> {
    // First check if the wallet exists and user has access to it
    await this.findWorkspaceWalletById(id, userId);

    // Update the wallet name
    const updatedWallet = await this.workspaceWalletModel
      .findByIdAndUpdate(id, { name }, { new: true })
      .exec();

    if (!updatedWallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return updatedWallet;
  }

  /**
   * Find all workspace wallets with their related wallets for a specific workspace
   */
  async findWorkspaceWallets(
    workspaceId: string,
    userId: string,
  ): Promise<{ data: Array<WorkspaceWallet & { wallets: Wallet[] }> }> {
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

    // Find all workspace wallets for this workspace
    const workspaceWallets = await this.workspaceWalletModel
      .find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .exec();

    if (!workspaceWallets.length) {
      return { data: [] };
    }

    // For each workspace wallet, get its associated wallets
    const result = await Promise.all(
      workspaceWallets.map(async (workspaceWallet) => {
        const wallets = await this.walletModel
          .find({ workspaceWallet: workspaceWallet._id })
          .exec();

        return {
          ...workspaceWallet.toJSON(),
          wallets: wallets.map((wallet) => wallet.toJSON()) as Wallet[],
        };
      }),
    );

    return { data: result };
  }
}
