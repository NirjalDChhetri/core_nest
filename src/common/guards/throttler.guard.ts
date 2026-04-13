import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard supporting:
 * - IP-based rate limiting (default, from client IP)
 * - User-based rate limiting (authenticated users tracked by userId)
 * - Per-endpoint rate limiting (via @CustomThrottle / @Throttle decorator)
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
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
