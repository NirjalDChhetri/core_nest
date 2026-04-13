import process from 'node:process';
import { HelperService } from '@common/helpers';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import {
  app,
  appConfigValidationSchema,
  database,
  databaseConfigValidationSchema,
  jwt,
  jwtConfigValidationSchema,
  mail,
  mailConfigValidationSchema,
  redis,
  redisConfigValidationSchema,
  oauth2,
  oauth2ConfigValidationSchema,
} from '../configs';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`${process.cwd()}/env/.env.${process.env.NODE_ENV}`],
      load: [app, database, jwt, mail, redis, oauth2],
      cache: true,
      isGlobal: true,
      expandVariables: true,
      validationSchema: Joi.object({
        ...appConfigValidationSchema,
        ...databaseConfigValidationSchema,
        ...jwtConfigValidationSchema,
        ...mailConfigValidationSchema,
        ...redisConfigValidationSchema,
        ...oauth2ConfigValidationSchema,
      }),
      validationOptions: {
        abortEarly: true,
        cache: !HelperService.isProd(),
        debug: !HelperService.isProd(),
        stack: !HelperService.isProd(),
      },
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class NestConfigModule {}
