import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the raw Bearer token from the Authorization header.
 * Usage: @BearerToken() token: string
 */
export const BearerToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.get('authorization') ?? '';
    return authHeader.replace('Bearer', '').trim();
  },
);
