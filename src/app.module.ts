import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { WorkspaceMembersModule } from './workspace-members/workspace-members.module';
import { WalletsModule } from './wallets/wallets.module';
import { NetworksModule } from './networks/networks.module';
import { CheckoutSessionsModule } from './checkout-sessions/checkout-sessions.module';
import mongoose from 'mongoose';
import { BalanceModule } from './balance/balance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProd = configService.get<string>('NODE_ENV') === 'production';
        return {
          uri: configService.get<string>('MONGODB_URI'),
          autoIndex: !isProd,
          connectionFactory: (connection: mongoose.Connection) => {
            connection.on('index', (err) => {
              if (err) {
                console.error('MongoDB index error: ', err);
              } else {
                console.log('MongoDB indices created');
              }
            });
            return connection;
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    WorkspacesModule,
    WorkspaceMembersModule,
    WalletsModule,
    NetworksModule,
    CheckoutSessionsModule,
    BalanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
