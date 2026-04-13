import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export const mail = registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'localhost',
  port: parseInt(process.env.MAIL_PORT!, 10) || 1025,
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'noreply@core-nest.com',
  secure: process.env.MAIL_SECURE === 'true',
}));

export const mailConfigValidationSchema = {
  MAIL_HOST: Joi.string().default('localhost'),
  MAIL_PORT: Joi.number().default(1025),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('noreply@core-nest.com'),
  MAIL_SECURE: Joi.boolean().default(false),
};