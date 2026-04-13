import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Configs } from '@lib/config/config.interface';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configs, true>) => {
        const appConfig = configService.getOrThrow('app', { infer: true });
        const isProduction = appConfig.env === 'production';

        return {
          // Override nestjs-pino's default { path: '*' } to avoid
          // NestJS v11 LegacyRouteConverter warning
          forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],

          pinoHttp: {
            level: isProduction ? 'info' : 'debug',

            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                },

            // Redact sensitive headers from logs
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-csrf-token"]',
              ],
              censor: '***',
            },

            // Auto-assign log levels based on HTTP status codes:
            // 5xx / errors → error, 4xx (client errors) → info, rest → info
            customLogLevel: (_req: any, res: any, err: Error | undefined) => {
              if (res.statusCode >= 500 || err) return 'error';
              return 'info';
            },

            // Disable automatic request/response logging entirely.
            // Only explicit logger calls (logger.log, logger.error, etc.) appear in terminal.
            autoLogging: false,
          },
        };
      },
    }),
  ],
})
export class PinoModule {}
