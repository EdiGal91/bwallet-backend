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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckoutSession.name, schema: CheckoutSessionSchema },
    ]),
    WalletsModule,
    WorkspacesModule,
  ],
  controllers: [CheckoutSessionsController],
  providers: [CheckoutSessionsService],
  exports: [CheckoutSessionsService],
})
export class CheckoutSessionsModule {}
