import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Network, NetworkSchema } from './schemas/network.schema';
import { Token, TokenSchema } from './schemas/token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Network.name, schema: NetworkSchema },
      { name: Token.name, schema: TokenSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class NetworksModule {}
