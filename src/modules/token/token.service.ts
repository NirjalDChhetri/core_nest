import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { REFRESH_TOKEN_REPOSITORY } from './interfaces/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from './interfaces/refresh-token-repository.interface';
import type { RefreshToken } from '@entities/refresh-token.entity';

const TOKEN_BLACKLIST_PREFIX = 'bl:';

@Injectable()
export class TokenService {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async storeRefreshToken(
    userId: number,
    rawToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);

    const hashedToken = await bcrypt.hash(rawToken, 12);
    const refreshToken = this.refreshTokenRepository.create({
      hashedToken,
      userId,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });
    await this.refreshTokenRepository.save(refreshToken);
  }

  async validateRefreshToken(
    userId: number,
    rawToken: string,
  ): Promise<RefreshToken | null> {
    const token = await this.refreshTokenRepository.findActiveByUserId(userId);
    if (!token) return null;

    const isValid = await bcrypt.compare(rawToken, token.hashedToken);
    return isValid ? token : null;
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  async blacklistAccessToken(
    accessToken: string,
    expiresInMs: number,
  ): Promise<void> {
    const ttl = Math.max(Math.ceil(expiresInMs / 1000), 1);
    await this.cacheManager.set(
      `${TOKEN_BLACKLIST_PREFIX}${accessToken}`,
      '1',
      ttl * 1000,
    );
  }

  async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
    const result = await this.cacheManager.get(
      `${TOKEN_BLACKLIST_PREFIX}${accessToken}`,
    );
    return result !== null && result !== undefined;
  }
}
