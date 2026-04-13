import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthProvider } from '@entities/user.entity';
import { UserService } from '@modules/user/user.service';
import type { Configs } from '@lib/config/config.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService<Configs, true>,
    private readonly userService: UserService,
  ) {
    const oauth2Config = configService.getOrThrow('oauth2', { infer: true });
    super({
      clientID: oauth2Config.google.clientId,
      clientSecret: oauth2Config.google.clientSecret,
      callbackURL: oauth2Config.google.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, name } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      done(new Error('Google account does not have an email'), undefined);
      return;
    }

    const user = await this.userService.findOrCreateOAuthUser({
      email,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      providerId: id,
      provider: AuthProvider.GOOGLE,
    });

    done(null, user);
  }
}
