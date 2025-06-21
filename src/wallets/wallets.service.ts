import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { WalletGeneratorService } from '../wallet-generator/wallet-generator.service';
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
import { Workspace } from '../workspaces/schemas/workspace.schema';

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
   * Get the next account index for a workspace
   * This follows BIP39 standard for account derivation
   */
  private async getNextAccountIndex(workspaceId: string): Promise<number> {
    const lastWallet = await this.workspaceWalletModel
      .findOne({ workspace: workspaceId })
      .sort({ accountIndex: -1 })
      .exec();

    return lastWallet ? lastWallet.accountIndex + 1 : 0;
  }

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

    // Get all requested networks that exist and are active
    const networkIds = createWorkspaceWalletDto.networks.map(n => n.networkId);
    const networks = await this.networksService.findByIds(networkIds);
    
    // Filter out networks that don't exist or are inactive
    const validNetworkRequests = createWorkspaceWalletDto.networks.filter(request => 
      networks.some(network => network.id === request.networkId)
    );

    if (validNetworkRequests.length === 0) {
      throw new NotFoundException('None of the requested networks exist or are active');
    }
    const bip39Mnemonic = await this.workspacesService.getBip39MnemonicById(workspace.id!)

    // Get the next account index for this workspace
    const accountIndex = await this.getNextAccountIndex(createWorkspaceWalletDto.workspaceId);
    
    const workspaceWallet = new this.workspaceWalletModel({
      name: createWorkspaceWalletDto.name,
      workspace: createWorkspaceWalletDto.workspaceId,
      accountIndex,
    });

    await workspaceWallet.save();

    const wallets: Wallet[] = [];

    for (const networkRequest of validNetworkRequests) {
      // Get network details to determine its type
      const networkDetails = networks.find(n => n.id === networkRequest.networkId)!;
      const addressIndex = 0;

      const generatedWallet = this.walletGeneratorService.generateWallet(bip39Mnemonic, networkDetails.name, accountIndex, addressIndex);

      // Create and save the wallet
      const wallet = new this.walletModel({
        networkId: networkRequest.networkId,
        workspaceWallet: workspaceWallet.id,
        address: generatedWallet.address,
        publicKey: generatedWallet.publicKey,
        derivationPath: generatedWallet.derivationPath,
        balance: 0,
        selectedTokens: networkRequest.tokenIds,
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
  ): Promise<WorkspaceWallet & { 
    wallets: Array<Wallet & { network?: NetworkWithTokens; selectedTokens: Token[] }>;
    workspace: Workspace;
  }> {
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

    // Get workspace details
    const workspace = await this.workspacesService.findById(workspaceId);

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
        wallet.selectedTokens.some(id => String(id) === String(token.id))
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
      workspace,
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
  ): Promise<{ data: Array<WorkspaceWallet & { wallets: Wallet[]; workspace: Workspace }> }> {
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

    // Get all blockchain wallets for these workspace wallets with populated network
    const wallets = await this.walletModel
      .find({
        workspaceWallet: { $in: workspaceWallets.map(w => w.id) },
      })
      .populate(['networkId', 'selectedTokens'])
      .exec();

    // Group wallets by workspace wallet
    const walletsByWorkspaceWallet = wallets.reduce((acc, wallet) => {
      const workspaceWalletId = String(wallet.workspaceWallet);
      if (!acc[workspaceWalletId]) {
        acc[workspaceWalletId] = [];
      }
      acc[workspaceWalletId].push(wallet);
      return acc;
    }, {} as Record<string, Wallet[]>);

    // Combine workspace wallets with their blockchain wallets and workspace info
    const result = workspaceWallets.map(workspaceWallet => ({
      ...workspaceWallet.toJSON(),
      wallets: walletsByWorkspaceWallet[workspaceWallet.id] || [],
      workspace,
    }));

    return { data: result };
  }

  /**
   * Find all workspace wallets across all workspaces the user has access to
   */
  async findAllWorkspaceWallets(
    userId: string,
  ): Promise<{ data: Array<WorkspaceWallet & { wallets: Wallet[]; userRole?: string }> }> {
    // Get all workspaces the user has access to
    const workspaceIds = await this.workspaceMembersService.findWorkspacesByUser(userId);
    
    // For each workspace, get the user's role and wallets
    const result = await Promise.all(
      workspaceIds.map(async (workspaceId) => {
        // Get user's role in the workspace
        const member = await this.workspaceMembersService.findMemberByWorkspaceAndUser(
          workspaceId,
          userId,
        );

        // Get wallets for this workspace
        const { data } = await this.findWorkspaceWallets(workspaceId, userId);

        // Add user role to each workspace wallet
        return data.map(wallet => {
          const { id, ...restWallet } = wallet
          return {
            workspaceWalletId: id,
          ...restWallet,
          userRole: member?.role,
        }
      });
      }),
    );

    // Flatten the array of arrays and return
    return { data: result.flat() };
  }
}
