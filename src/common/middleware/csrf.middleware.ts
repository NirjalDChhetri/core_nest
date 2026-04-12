import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { ConfigService } from '@nestjs/config';
import type { Configs } from '@lib/config/config.interface';
import { HelperService } from '@common/helpers';

function createCsrfConfig(secret: string) {
  return {
    getSecret: () => secret,
    getSessionIdentifier: (req: any) =>
      req.ip || req.connection?.remoteAddress || '',
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: HelperService.isProd(),
      path: '/',
    },
    getCsrfTokenFromRequest: (req: any) =>
      req.headers['x-csrf-token'] as string,
  };
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection: ReturnType<typeof doubleCsrf>;

  constructor(private readonly configService: ConfigService<Configs, true>) {
    const appConfig = this.configService.getOrThrow('app', { infer: true });
    this.csrfProtection = doubleCsrf(createCsrfConfig(appConfig.csrfSecret));
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    try {
      this.csrfProtection.doubleCsrfProtection(req, res, next);
    } catch {
      throw new ForbiddenException('Invalid CSRF token');
    }
  }
}

/**
 * Service to generate CSRF tokens.
 * Must be called before any state-changing request.
 */
@Injectable()
export class CsrfTokenService {
  private csrfProtection: ReturnType<typeof doubleCsrf>;

  constructor(private readonly configService: ConfigService<Configs, true>) {
    const appConfig = this.configService.getOrThrow('app', { infer: true });
    this.csrfProtection = doubleCsrf(createCsrfConfig(appConfig.csrfSecret));
  }

  generateToken(req: Request, res: Response): string {
    return this.csrfProtection.generateCsrfToken(req, res);
  }
}
