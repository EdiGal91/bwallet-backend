import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import {
  WorkspaceWallet,
  WorkspaceWalletSchema,
} from './schemas/workspace-wallet.schema';
import { WalletGeneratorModule } from '../wallet-generator/wallet-generator.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WorkspaceMembersModule } from '../workspace-members/workspace-members.module';
import { NetworksModule } from '../networks/networks.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: WorkspaceWallet.name, schema: WorkspaceWalletSchema },
    ]),
    WorkspacesModule,
    WorkspaceMembersModule,
    NetworksModule,
    WalletGeneratorModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
