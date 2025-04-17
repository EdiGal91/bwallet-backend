import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('1')
  getHelloV1(): string {
    return this.appService.getHello() + ' (v1)';
  }

  @Get()
  @Version('2')
  getHelloV2(): string {
    return this.appService.getHello() + ' (v2)';
  }

  @Get()
  @Version('3')
  getHelloV3(): string {
    return this.appService.getHello() + ' (v3)';
  }
}
