import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { map } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '@common/decorators/response-message.decorator';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    return next.handle().pipe(
      map((data) => {
        const base: ApiResponse<T> = {
          success: true,
          statusCode: response.statusCode,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        // Only include `data` key when the handler actually returns something
        if (data !== undefined && data !== null) {
          base.data = data;
        }

        return base;
      }),
    );
  }
}
