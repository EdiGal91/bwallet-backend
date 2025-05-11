import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  NotImplementedException,
} from '@nestjs/common';
import { CheckoutSessionsService } from './checkout-sessions.service';
import {
  CheckoutSession,
  CheckoutSessionStatus,
} from './schemas/checkout-session.schema';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('checkout-sessions')
export class CheckoutSessionsController {
  constructor(
    private readonly checkoutSessionsService: CheckoutSessionsService,
  ) {}

  /**
   * Used by external API to create checkout sessions for merchants
   * This endpoint allows merchants to programmatically create payment sessions
   * that their customers will be redirected to
   */
  @Post()
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSession> {
    return this.checkoutSessionsService.createCheckoutSession(
      createCheckoutSessionDto,
    );
  }

  /**
   * Retrieves a checkout session by token
   * This public endpoint is used by the payment page to load session details securely
   */
  @Get('token/:token')
  async findCheckoutSessionByToken(
    @Param('token') token: string,
  ): Promise<CheckoutSession> {
    return this.checkoutSessionsService.findByToken(token);
  }

  /**
   * Retrieves a specific checkout session by its ID
   * Used by the payment page to load session details for customers
   * This endpoint is publicly accessible without authentication
   */
  @Get(':id')
  async findCheckoutSessionById(
    @Param('id') id: string,
  ): Promise<CheckoutSession> {
    throw new NotImplementedException(
      'Cancellation functionality will be implemented in a future release',
    );

    // The code below is kept for future implementation
    return this.checkoutSessionsService.findById(id);
  }

  /**
   * Retrieves all checkout sessions for a specific workspace
   * Used by merchants to view their payment history and transaction details
   * This endpoint requires authentication and proper workspace access
   */
  @Get('workspace/:workspaceId')
  async findCheckoutSessionsByWorkspace(
    @Param('workspaceId') workspaceId: string,
  ): Promise<CheckoutSession[]> {
    throw new NotImplementedException(
      'Cancellation functionality will be implemented in a future release',
    );

    // The code below is kept for future implementation
    return this.checkoutSessionsService.findByWorkspace(workspaceId);
  }

  /**
   * Cancels a checkout session if it's in pending status
   * Used when a customer abandons the payment or clicks the cancel button
   */
  @Patch(':id/cancel')
  async cancelCheckoutSession(
    @Param('id') id: string,
  ): Promise<CheckoutSession> {
    return this.checkoutSessionsService.updateStatus(
      id,
      CheckoutSessionStatus.CANCELLED,
    );
  }
}
