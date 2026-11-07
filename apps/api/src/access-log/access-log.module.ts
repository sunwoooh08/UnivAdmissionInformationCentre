import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AccessLogInterceptor } from './access-log.interceptor.js';
import { AccessLogService } from './access-log.service.js';

@Global()
@Module({
  providers: [AccessLogService, { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor }],
  exports: [AccessLogService],
})
export class AccessLogModule {}
