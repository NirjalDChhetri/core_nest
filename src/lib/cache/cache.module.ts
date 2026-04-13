import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import type { Configs } from '@lib/config/config.interface';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Configs, true>) => {
        const redisConfig = configService.getOrThrow('redis', { infer: true });

        return {
          store: await redisStore({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password || undefined,
            ttl: redisConfig.ttl * 1000,
          }),
        };
      },
    }),
  ],
})
export class RedisCacheModule {}
