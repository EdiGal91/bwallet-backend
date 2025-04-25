import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NetworksService } from './networks.service';
import { NetworksController } from './networks.controller';
import { Network, NetworkSchema } from './schemas/network.schema';
import { Token, TokenSchema } from './schemas/token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Network.name, schema: NetworkSchema },
      { name: Token.name, schema: TokenSchema },
    ]),
  ],
  controllers: [NetworksController],
     providers: [NetworksService],
  exports: [NetworksService],
})
export class NetworksModule {}
