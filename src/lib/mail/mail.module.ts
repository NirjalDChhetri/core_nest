import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import type { Configs } from '@lib/config/config.interface';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configs, true>) => {
        const mailConfig = configService.getOrThrow('mail', { infer: true });
        return {
          transport: {
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.secure,
            auth:
              mailConfig.user && mailConfig.password
                ? {
                    user: mailConfig.user,
                    pass: mailConfig.password,
                  }
                : undefined,
          },
          defaults: {
            from: `"Core Nest" <${mailConfig.from}>`,
          },
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
