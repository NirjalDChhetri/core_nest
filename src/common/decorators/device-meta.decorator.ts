import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestDeviceMeta } from '@common/middleware/device-info.middleware';

/**
 * Parameter decorator that extracts the parsed device metadata from the request.
 * Requires DeviceInfoMiddleware to be registered globally.
 *
 * Usage:
 * ```ts
 * @Post('login')
 * async login(@DeviceMeta() meta: RequestDeviceMeta) { ... }
 * ```
 */
export const DeviceMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestDeviceMeta => {
    const request = ctx.switchToHttp().getRequest();
    return request.deviceMeta;
  },
);
