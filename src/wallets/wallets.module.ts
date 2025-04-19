import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletGeneratorService } from './wallet-generator.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WorkspaceMembersModule } from '../workspace-members/workspace-members.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    WorkspacesModule,
    WorkspaceMembersModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService, WalletGeneratorService],
  exports: [WalletsService],
})
export class WalletsModule {}
