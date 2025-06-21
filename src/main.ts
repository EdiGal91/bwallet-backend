import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { EtherscanService } from './balance/etherscan.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Use cookie parser
  app.use(cookieParser());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS with credentials
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  const { PORT: port = 4000 } = process.env;
  await app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // const eth = app.get(EtherscanService);
  // const result = await eth.getTokenWeiBalance('0xd41efB3CA0528F6cFcf745Ea8DCcaEAd7300f561', 137, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F');
  // console.log(`result: ${result}`);

}
bootstrap();
