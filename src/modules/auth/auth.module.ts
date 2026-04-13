import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy, JwtRefreshStrategy, GoogleStrategy } from './strategies';
import { UserModule } from '@modules/user/user.module';
import { TokenModule } from '@modules/token/token.module';
import { OtpModule } from '@modules/otp/otp.module';
import type { Configs } from '@lib/config/config.interface';

@Module({
  imports: [
    UserModule,
    TokenModule,
    OtpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configs, true>) => {
        const jwtConfig = configService.getOrThrow('jwt', { infer: true });
        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn: jwtConfig.accessExpiresIn as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
