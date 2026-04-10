import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import {
  THROTTLE_LIMIT_KEY,
  THROTTLE_TTL_KEY,
  SKIP_THROTTLE_KEY,
} from '@common/decorators/throttle.decorator';

/**
 * Custom throttler guard supporting:
 * - IP-based rate limiting (default, from client IP)
 * - User-based rate limiting (authenticated users tracked by userId)
 * - Endpoint-based rate limiting (via @CustomThrottle decorator)
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  declare protected reflector: Reflector;

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return skip ?? false;
  }

  /**
   * Generates a tracking key combining IP + userId (if authenticated) + route.
   * This enables layered rate limiting:
   * - Anonymous: tracked by IP + route path
   * - Authenticated: tracked by userId + route path (more granular)
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userId = req.user?.id;
    const route = req.originalUrl || req.url || '';

    // User-based tracking takes precedence if authenticated
    if (userId) {
      return `user-${userId}-${route}`;
    }

    return `ip-${ip}-${route}`;
  }
}
