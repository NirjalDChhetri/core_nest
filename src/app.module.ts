import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NestConfigModule } from '@lib/config/configs/config.module';
import { TypeOrmConfigModule } from '@lib/config/typeorm.module';
import { MailModule } from '@lib/mail/mail.module';
import { RedisCacheModule } from '@lib/cache/cache.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { SecurityModule } from '@modules/security/security.module';
import { HealthModule } from '@modules/health/health.module';
import { PinoModule } from '@lib/pino';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CustomThrottlerGuard } from '@common/guards/throttler.guard';
import { CsrfMiddleware } from '@common/middleware/csrf.middleware';
import type { Configs } from '@lib/config/config.interface';

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
    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
