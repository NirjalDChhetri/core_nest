import { Throttle, SkipThrottle as NestSkipThrottle } from '@nestjs/throttler';

/**
 * Custom endpoint-level throttle decorator.
 * Wraps @nestjs/throttler's @Throttle() so ThrottlerGuard natively applies
 * per-endpoint overrides.
 * @param limit - Max requests within the TTL window
 * @param ttl - Time-to-live in seconds
 */
export const CustomThrottle = (limit: number, ttl: number) =>
  Throttle({ default: { limit, ttl: ttl * 1000 } });

/**
 * Skip rate limiting for a specific endpoint.
 */
export const SkipThrottle = () => NestSkipThrottle();
