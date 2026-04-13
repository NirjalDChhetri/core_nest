import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { TokenService } from '@modules/token/token.service';
import type { Configs } from '@lib/config/config.interface';
import type { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<Configs, true>,
    private readonly tokenService: TokenService,
  ) {
    const jwtConfig = configService.getOrThrow('jwt', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const authHeader = req.get('authorization') ?? '';
    const accessToken = authHeader.replace('Bearer', '').trim();

    // Reject blacklisted tokens (logout / password change)
    if (accessToken) {
      const isBlacklisted =
        await this.tokenService.isAccessTokenBlacklisted(accessToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
