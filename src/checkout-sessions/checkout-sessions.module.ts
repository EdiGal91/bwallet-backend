import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckoutSessionsController } from './checkout-sessions.controller';
import { CheckoutSessionsService } from './checkout-sessions.service';
import {
  CheckoutSession,
  CheckoutSessionSchema,
} from './schemas/checkout-session.schema';
import { WalletsModule } from '../wallets/wallets.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckoutSession.name, schema: CheckoutSessionSchema },
    ]),
    WalletsModule,
    WorkspacesModule,
    ConfigModule,
  ],
  controllers: [CheckoutSessionsController],
  providers: [CheckoutSessionsService],
  exports: [CheckoutSessionsService],
})
export class CheckoutSessionsModule {}
