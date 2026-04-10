import { HelperService } from '@common/helpers';
import { Logger } from '@nestjs/common';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

const logger = new Logger('TypeORM');

export const typeOrmBaseOptions: Partial<PostgresConnectionOptions> = {
  entities: ['dist/entities/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,

  extra: {
    max: 10,
    min: 2,
    connectionTimeoutMillis: 5000,
  },

  logging: !HelperService.isProd(),
  logger: 'advanced-console',

  // timezone: 'Z',

  synchronize: false,
  dropSchema: false,


};
