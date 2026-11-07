import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 리버스 프록시(Next.js rewrites, Nginx 등) 뒤에서 실제 접속 IP를 로그에 남기기 위함
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const origin = process.env.WEB_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  if (origin?.length) app.enableCors({ origin });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, process.env.HOST ?? '0.0.0.0');
  Logger.log(`API listening on :${port}/api`, 'Bootstrap');
}

void bootstrap();
