import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export const redis = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT!, 10) || 6379,
  password: process.env.REDIS_PASSWORD || '',
  ttl: Number.parseInt(process.env.REDIS_TTL!, 10) || 300,
}));

export const redisConfigValidationSchema = {
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TTL: Joi.number().default(300),
};
