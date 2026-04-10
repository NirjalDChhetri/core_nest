import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NestConfigModule } from './lib/config/configs/config.module';
import { TypeOrmConfigModule } from './lib/config/typeorm.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { SecurityModule } from '@modules/security/security.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CustomThrottlerGuard } from '@common/guards/throttler.guard';
import { CsrfMiddleware } from '@common/middleware/csrf.middleware';
import type { Configs } from '@lib/config/config.interface';

@Module({
  imports: [
    NestConfigModule,
    TypeOrmConfigModule,
    // Rate limiting - configurable via env
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configs, true>) => {
        const appConfig = configService.getOrThrow('app', { infer: true });
        return [
          {
            ttl: appConfig.throttleTtl * 1000, // convert seconds to ms
            limit: appConfig.throttleLimit,
          },
        ];
      },
    }),
    AuthModule,
    UserModule,
    SecurityModule,
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
    // Apply CSRF protection to all state-changing routes
    consumer.apply(CsrfMiddleware).forRoutes('*path');
  }
}
