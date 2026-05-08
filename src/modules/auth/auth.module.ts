import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Role } from '@entities/role.entity';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { OtpModule } from '@modules/otp/otp.module';
import { UserModule } from '@modules/user/user.module';
import { TokenModule } from '@modules/token/token.module';
import type { Configs } from '@lib/config/config.interface';
import { DeviceModule } from '@modules/device/device.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtRefreshStrategy, GoogleStrategy } from './strategies';

@Module({
  imports: [
    UserModule,
    TokenModule,
    DeviceModule,
    OtpModule,
    TypeOrmModule.forFeature([Role]),
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
