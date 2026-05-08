import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override handleRequest<TUser = any>(err: any, user: TUser): TUser {
    if (err) {
      // TokenError — expired / already-used auth code (status always 500 in passport-oauth2)
      if (err.name === 'TokenError') {
        throw new BadRequestException(
          'Google OAuth failed: the authorization code is invalid or has already been used. Please try signing in again.',
        );
      }
      if (err.name === 'AuthorizationError') {
        throw new UnauthorizedException(
          'Google OAuth failed: access was denied.',
        );
      }
      throw new InternalServerErrorException(
        'Google OAuth encountered an unexpected error.',
      );
    }
    if (!user) {
      throw new UnauthorizedException('Google authentication failed.');
    }
    return user;
  }
}
