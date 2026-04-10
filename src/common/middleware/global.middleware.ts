import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { app } from '@lib/config/configs/index.js';
import { HelperService } from '@common/helpers';

type AppConfig = ConfigType<typeof app>;

export function setupGlobalMiddleware(
  application: INestApplication,
  appConfig: AppConfig,
) {
  // Global prefix
  application.setGlobalPrefix(appConfig.prefix);

  // Validation pipe
  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Helmet – Security headers
  application.use(
    helmet({
      contentSecurityPolicy: HelperService.isProd() ? undefined : false,
      crossOriginEmbedderPolicy: HelperService.isProd(),
    }),
  );

  // Cookie parser
  application.use(cookieParser());

  // CORS
  application.enableCors({
    origin: appConfig.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
    ],
    credentials: true,
    maxAge: 86400,
  });
}
