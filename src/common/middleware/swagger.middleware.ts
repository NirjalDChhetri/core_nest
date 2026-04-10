import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { app } from '@lib/config/configs/index.js';
import { HelperService } from '@common/helpers';

type AppConfig = ConfigType<typeof app>;

export function setupSwagger(
  application: INestApplication,
  appConfig: AppConfig,
) {
  if (HelperService.isProd()) return;

  const config = new DocumentBuilder()
    .setTitle(appConfig.name)
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(appConfig.url)
    .build();

  const document = SwaggerModule.createDocument(application, config);
  SwaggerModule.setup('docs', application, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
