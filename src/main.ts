import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helpers';
import type { Configs } from '@lib/config/config.interface';
import { setupGlobalMiddleware, setupSwagger } from '@common/middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<Configs, true>);
  const appConfig = configService.getOrThrow('app', { infer: true });
  console.log(appConfig);

  const logger = new Logger('Bootstrap');

  setupGlobalMiddleware(app, appConfig);
  setupSwagger(app, appConfig);

  await app.listen(appConfig.port);

  logger.log(`Application is running on: ${appConfig.url}`);
  if (!HelperService.isProd()) {
    logger.log(`Swagger docs: ${appConfig.url}/docs`);
  }
}

bootstrap();
