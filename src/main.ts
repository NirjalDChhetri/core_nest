import { AppModule } from './app.module';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helpers';
import { AllExceptionFilter, QueryFailedFilter } from '@common/filters';
import {
  TimeoutInterceptor,
  TransformResponseInterceptor,
} from '@common/interceptors';
import type { Configs } from '@lib/config/config.interface';
import { setupGlobalMiddleware, setupSwagger } from '@common/middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService<Configs, true>);
  const appConfig = configService.getOrThrow('app', { infer: true });

  // Global filters — catch DB + all exceptions
  app.useGlobalFilters(new AllExceptionFilter(), new QueryFailedFilter());

  // Global interceptors — transform response shape, then apply timeout
  app.useGlobalInterceptors(
    new TransformResponseInterceptor(app.get(Reflector)),
    new TimeoutInterceptor(),
  );

  setupGlobalMiddleware(app, appConfig);
  setupSwagger(app, appConfig);

  // Graceful shutdown — close DB connections, Redis, etc.
  app.enableShutdownHooks();

  await app.listen(appConfig.port);

  logger.log(`Application is running on: ${appConfig.url}`);
  if (!HelperService.isProd()) {
    logger.log(`Swagger docs: ${appConfig.url}/docs`);
  }
}

bootstrap();
