import Joi from 'joi';
import process from 'node:process';
import { registerAs } from '@nestjs/config';
import { APP_ENVIRONMENTS, VERSION_VALIDATION_MESSAGE } from '@common/constant';

// Validation schema
export const appConfigValidationSchema = {
  NODE_ENV: Joi.string()
    .valid(...APP_ENVIRONMENTS)
    .required(),
  APP_PORT: Joi.number().port().required(),
  API_URL: Joi.string().uri().required(),
  APP_PREFIX: Joi.string().default('api/v1'),
  APP_NAME: Joi.string().required(),
  CORS_ORIGINS: Joi.string().required(),
  CSRF_SECRET: Joi.string().min(32).required(),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
};

// Config
export const app = registerAs('app', () => ({
  port: Number(process.env.APP_PORT!),
  prefix: process.env.APP_PREFIX!,
  env: process.env.NODE_ENV!,
  url: process.env.API_URL!,
  name: process.env.APP_NAME!,
  corsOrigins: process.env.CORS_ORIGINS!.split(',').map((o) => o.trim()),
  csrfSecret: process.env.CSRF_SECRET!,
  throttleTtl: Number(process.env.THROTTLE_TTL || 60),
  throttleLimit: Number(process.env.THROTTLE_LIMIT || 10),
}));
