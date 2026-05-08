import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PinoModule } from '@lib/pino';
import { APP_GUARD } from '@nestjs/core';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { MailModule } from '@lib/mail/mail.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { RolesGuard } from '@common/guards/roles.guard';
import { RedisCacheModule } from '@lib/cache/cache.module';
import type { Configs } from '@lib/config/config.interface';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from '@modules/health/health.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { TypeOrmConfigModule } from '@lib/config/typeorm.module';
import { SecurityModule } from '@modules/security/security.module';
import { CsrfMiddleware } from '@common/middleware/csrf.middleware';
import { NestConfigModule } from '@lib/config/configs/config.module';
import { CustomThrottlerGuard } from '@common/guards/throttler.guard';
import { DeviceInfoMiddleware } from '@common/middleware/device-info.middleware';

@Module({
  imports: [
    NestConfigModule,
    PinoModule,
    TypeOrmConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configs, true>) => {
        const appConfig = configService.getOrThrow('app', { infer: true });
        return [
          {
            ttl: appConfig.throttleTtl * 1000,
            limit: appConfig.throttleLimit,
          },
        ];
      },
    }),
    MailModule,
    RedisCacheModule,
    AuthModule,
    UserModule,
    SecurityModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // DeviceInfoMiddleware MUST run before CSRF so req.deviceMeta is available
    consumer
      .apply(DeviceInfoMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
