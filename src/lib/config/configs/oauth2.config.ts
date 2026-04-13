import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export const oauth2 = registerAs('oauth2', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || '',
    appSecret: process.env.FACEBOOK_APP_SECRET || '',
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || '',
  },
  magicLink: {
    secret: process.env.MAGIC_LINK_SECRET || '',
    callbackUrl: process.env.MAGIC_LINK_CALLBACK_URL || '',
  },
}));

export const oauth2ConfigValidationSchema = {
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string().allow('').default(''),
  FACEBOOK_APP_ID: Joi.string().allow('').default(''),
  FACEBOOK_APP_SECRET: Joi.string().allow('').default(''),
  FACEBOOK_CALLBACK_URL: Joi.string().allow('').default(''),
  MAGIC_LINK_SECRET: Joi.string().allow('').default(''),
  MAGIC_LINK_CALLBACK_URL: Joi.string().allow('').default(''),
};
