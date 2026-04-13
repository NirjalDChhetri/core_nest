import {
  ForbiddenException,
  Inject,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { FactoryProvider } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { ConfigService } from '@nestjs/config';
import type { Configs } from '@lib/config/config.interface';
import { HelperService } from '@common/helpers';

export const CSRF_PROTECTION = 'CSRF_PROTECTION';

type CsrfProtection = ReturnType<typeof doubleCsrf>;

function createCsrfConfig(secret: string) {
  const isProd = HelperService.isProd();
  return {
    getSecret: () => secret,
    getSessionIdentifier: (req: any) =>
      req.ip || req.connection?.remoteAddress || '',
    // __Host- prefix requires Secure=true; in dev (HTTP) the browser silently
    // drops the cookie, so CSRF validation always fails. Use a plain name in dev.
    cookieName: isProd ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: isProd,
      path: '/',
    },
    getCsrfTokenFromRequest: (req: any) =>
      req.headers['x-csrf-token'] as string,
  };
}

export const CsrfProtectionProvider: FactoryProvider<CsrfProtection> = {
  provide: CSRF_PROTECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<Configs, true>): CsrfProtection => {
    const appConfig = configService.getOrThrow('app', { infer: true });
    return doubleCsrf(createCsrfConfig(appConfig.csrfSecret));
  },
};

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(
    @Inject(CSRF_PROTECTION) private readonly csrfProtection: CsrfProtection,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // CSRF protection is only enforced in production.
    // In dev/test environments it would block all local API testing.
    if (!HelperService.isProd()) {
      return next();
    }

    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    this.csrfProtection.doubleCsrfProtection(req, res, (err?: any) => {
      if (err) {
        next(new ForbiddenException('Invalid CSRF token'));
        return;
      }
      next();
    });
  }
}

/**
 * Service to generate CSRF tokens.
 * Must be called before any state-changing request.
 */
@Injectable()
export class CsrfTokenService {
  constructor(
    @Inject(CSRF_PROTECTION) private readonly csrfProtection: CsrfProtection,
  ) {}

  generateToken(req: Request, res: Response): string {
    return this.csrfProtection.generateCsrfToken(req, res);
  }
}
