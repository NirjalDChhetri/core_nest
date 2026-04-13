import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { app } from '@lib/config/configs';
import { HelperService } from '@common/helpers';

type AppConfig = ConfigType<typeof app>;

export function setupSwagger(
  application: INestApplication,
  appConfig: AppConfig,
) {
  if (HelperService.isProd()) return;

  const config = new DocumentBuilder()
    .setTitle(appConfig.name)
    .setDescription(
      'API documentation\n\n' +
        '**CSRF Protection**: All state-changing requests (POST, PUT, PATCH, DELETE) require a valid CSRF token.\n' +
        'Call `GET /security/csrf-token` first, then paste the returned token into the `csrf-token` field below.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-csrf-token' },
      'csrf-token',
    )
    .addSecurityRequirements('csrf-token')
    .addServer(appConfig.url)
    .build();

  const document = SwaggerModule.createDocument(application, config);
  SwaggerModule.setup('docs', application, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
