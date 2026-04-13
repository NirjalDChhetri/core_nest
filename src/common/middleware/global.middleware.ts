import type { INestApplication } from '@nestjs/common';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { ConfigType } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { app } from '@lib/config/configs';
import { HelperService } from '@common/helpers';

function formatValidationErrors(
  errors: ValidationError[],
  parentField = '',
): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, error) => {
    const field = parentField
      ? `${parentField}.${error.property}`
      : error.property;

    if (error.constraints) {
      acc[field] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      Object.assign(acc, formatValidationErrors(error.children, field));
    }

    return acc;
  }, {});
}

type AppConfig = ConfigType<typeof app>;

export function setupGlobalMiddleware(
  application: INestApplication,
  appConfig: AppConfig,
) {
  // Trust proxy for correct IP behind reverse proxy / Docker
  const httpAdapter = application.getHttpAdapter();
  httpAdapter.getInstance().set('trust proxy', true);
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
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException({
          message: 'Validation failed',
          errors: formatValidationErrors(errors),
        });
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
