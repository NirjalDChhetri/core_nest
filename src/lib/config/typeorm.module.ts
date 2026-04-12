import { Global, Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Configs } from './config.interface';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { typeOrmBaseOptions } from '@common/database/typeorm.config';
import { DataSource } from 'typeorm';

const logger = new Logger('Database');

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configs, true>) => {
        const dbConfig = configService.getOrThrow('database', {
          infer: true,
        });

        return {
          ...typeOrmBaseOptions,
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          ssl: dbConfig.ssl,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmConfigModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      logger.log('Database connected successfully');
    }
  }
}
