import process from 'node:process';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { typeOrmBaseOptions } from './typeorm.config';

config({
  path: `${process.cwd()}/env/.env.${process.env.NODE_ENV || 'development'}`,
});

const cliConfig: PostgresConnectionOptions = {
  ...typeOrmBaseOptions,
  type: 'postgres',

  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,

  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],

  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

export default new DataSource(cliConfig);
