import { SetMetadata } from '@nestjs/common';

export const THROTTLE_LIMIT_KEY = 'throttle:limit';
export const THROTTLE_TTL_KEY = 'throttle:ttl';

/**
 * Custom endpoint-level throttle decorator.
 * Overrides the default rate limit for a specific endpoint.
 * @param limit - Max requests within the TTL window
 * @param ttl - Time-to-live in seconds
 */
export const CustomThrottle = (limit: number, ttl: number) => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    SetMetadata(THROTTLE_LIMIT_KEY, limit)(target, propertyKey!, descriptor!);
    SetMetadata(THROTTLE_TTL_KEY, ttl)(target, propertyKey!, descriptor!);
  };
};

export const SKIP_THROTTLE_KEY = 'skipThrottle';
/**
 * Skip rate limiting for a specific endpoint.
 */
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);
