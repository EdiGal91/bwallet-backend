import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CheckoutSession,
  CheckoutSessionDocument,
  CheckoutSessionStatus,
} from './schemas/checkout-session.schema';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { WalletsService } from '../wallets/wallets.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CheckoutSessionsService {
  constructor(
    @InjectModel(CheckoutSession.name)
    private checkoutSessionModel: Model<CheckoutSessionDocument>,
    private walletsService: WalletsService,
    private workspacesService: WorkspacesService,
    private configService: ConfigService,
  ) {}

  async createCheckoutSession(
    createCheckoutSessionDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSession> {
    const {
      workspaceId,
      walletId,
      networkId,
      currency,
      amount,
      redirectUrl,
      customerEmail,
      customerName,
      metadata,
    } = createCheckoutSessionDto;

    // Fixed expiration time: 60 minutes
    const EXPIRATION_TIME_MINUTES = 60;

    // Verify workspace exists
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Verify wallet exists and belongs to the workspace
    const wallet =
      await this.walletsService.getWalletWithoutAccessCheck(walletId);
    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    // TODO: Uncomment this when we have workspace wallets
    // if (String(wallet.workspace) !== workspaceId) {
    //   throw new BadRequestException(
    //     'Wallet does not belong to the specified workspace',
    //   );
    // }

    // Ensure the wallet network matches the requested network
    if (String(wallet.networkId) !== networkId) {
      throw new BadRequestException(
        `Wallet network does not match requested network`,
      );
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + EXPIRATION_TIME_MINUTES);

    // Generate a unique token
    const token = crypto.randomBytes(16).toString('hex');

    // Build the checkout URL
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const checkoutUrl = `${frontendUrl}/checkout/${token}`;

    // Create checkout session
    const checkoutSession = new this.checkoutSessionModel({
      workspace: workspaceId,
      wallet: walletId,
      network: networkId,
      currency,
      amount,
      redirectUrl,
      checkoutUrl,
      customerEmail,
      customerName,
      metadata,
      expiresAt,
      token,
      status: CheckoutSessionStatus.PENDING,
    });

    return checkoutSession.save();
  }

  async findById(id: string): Promise<CheckoutSession> {
    const checkoutSession = await this.checkoutSessionModel
      .findById(id)
      .populate('workspace')
      .populate('wallet')
      .populate('network')
      .exec();

    if (!checkoutSession) {
      throw new NotFoundException(`Checkout session with ID ${id} not found`);
    }

    return checkoutSession;
  }

  async findByWorkspace(workspaceId: string): Promise<CheckoutSession[]> {
    return this.checkoutSessionModel
      .find({ workspace: workspaceId })
      .populate('wallet')
      .populate('network')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    id: string,
    status: CheckoutSessionStatus,
  ): Promise<CheckoutSession> {
    const checkoutSession = await this.checkoutSessionModel.findById(id).exec();

    if (!checkoutSession) {
      throw new NotFoundException(`Checkout session with ID ${id} not found`);
    }

    // Only allow cancellation if the session is in PENDING status
    const isAttemptingToCancel = status === CheckoutSessionStatus.CANCELLED;
    const isSessionPending =
      checkoutSession.status === CheckoutSessionStatus.PENDING;
    const isInvalidCancellation = isAttemptingToCancel && !isSessionPending;

    if (isInvalidCancellation) {
      throw new BadRequestException(
        `Cannot cancel checkout session with status ${checkoutSession.status}. Only PENDING sessions can be cancelled.`,
      );
    }

    checkoutSession.status = status;
    return checkoutSession.save();
  }

  async findByToken(token: string): Promise<any> {
    const checkoutSession = await this.checkoutSessionModel
      .findOne({ token })
      .populate('wallet', 'address networkId')
      .populate('network', 'name symbol')
      .exec();

    if (!checkoutSession) {
      throw new NotFoundException(
        `Checkout session with token ${token} not found`,
      );
    }

    // Create a new object with only the fields we want to expose
    const {
      wallet,
      network,
      currency,
      amount,
      status,
      redirectUrl,
      customerEmail,
      customerName,
      metadata,
      token: sessionToken,
      expiresAt,
    } = checkoutSession.toJSON();

    return {
      wallet: {
        address: wallet.address,
        network: {
          name: network.name,
          symbol: network.symbol,
        },
      },
      network: {
        name: network.name,
        symbol: network.symbol,
      },
      currency,
      amount,
      status,
      redirectUrl,
      customerEmail,
      customerName,
      metadata,
      token: sessionToken,
      expiresAt,
    };
  }
}
