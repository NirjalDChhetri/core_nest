import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { REFRESH_TOKEN_REPOSITORY } from './interfaces/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from './interfaces/refresh-token-repository.interface';
import type { RefreshToken } from '@entities/refresh-token.entity';

const TOKEN_BLACKLIST_PREFIX = 'bl:';

/** Maximum concurrent active sessions per user. Oldest session is auto-revoked when exceeded. */
const MAX_SESSIONS_PER_USER = 10;

export interface SessionInfo {
  sessionIdx: string;
  deviceId: number | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Hash and persist a refresh token for a new session.
   *
   * Security features:
   * 1. Same-device deduplication: if `deviceId` (user_devices.id) is provided,
   *    revokes any existing active session for the same user+device before creating a new one.
   * 2. Concurrent session limit: if user exceeds MAX_SESSIONS_PER_USER, the oldest
   *    session is auto-revoked.
   */
  async storeRefreshToken(
    userId: number,
    rawToken: string,
    expiresAt: Date,
    sessionIdx: string,
    deviceId?: number | null,
  ): Promise<void> {
    // ── Same-device deduplication (requirement #1) ───────────────────────────
    if (deviceId) {
      await this.refreshTokenRepository.revokeByDeviceId(userId, deviceId);
    }

    // ── Concurrent session limit ─────────────────────────────────────────────
    const activeSessions =
      await this.refreshTokenRepository.findActiveSessionsByUserId(userId);
    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
      // Revoke the oldest session (last in the list, ordered DESC by lastUsedAt)
      const oldest = activeSessions[activeSessions.length - 1];
      if (oldest.idx) {
        await this.refreshTokenRepository.revokeByIdx(oldest.idx, userId);
        this.logger.warn(
          `Session limit reached for user ${userId}. Revoked oldest session ${oldest.idx}.`,
        );
      }
    }

    const hashedToken = await bcrypt.hash(rawToken, 12);
    const entity = this.refreshTokenRepository.create({
      idx: sessionIdx,
      hashedToken,
      userId,
      expiresAt,
      deviceId: deviceId ?? null,
      isRevoked: false,
    });
    await this.refreshTokenRepository.save(entity);
  }

  /**
   * Validate a refresh token by session idx.
   *
   * Security: TOKEN REUSE DETECTION
   * If the session idx exists but is already revoked, it means the token was
   * previously rotated — someone is reusing a stolen token. In this case, ALL
   * sessions for that user are immediately revoked (nuclear option) to prevent
   * the attacker from maintaining access.
   */
  async validateRefreshToken(
    sessionIdx: string,
    rawToken: string,
  ): Promise<RefreshToken | null> {
    const token = await this.refreshTokenRepository.findActiveByIdx(sessionIdx);

    if (!token) {
      // ── Token reuse attack detection ─────────────────────────────────────
      // Check if this session was already revoked — if so, it's a replay attack
      const revokedToken =
        await this.refreshTokenRepository.findRevokedByIdx(sessionIdx);
      if (revokedToken) {
        this.logger.error(
          `TOKEN REUSE DETECTED for user ${revokedToken.userId}, session ${sessionIdx}. ` +
            `Revoking ALL sessions as a precaution.`,
        );
        await this.revokeAllSessions(revokedToken.userId);
      }
      return null;
    }

    const isValid = await bcrypt.compare(rawToken, token.hashedToken);
    if (!isValid) return null;

    await this.refreshTokenRepository.touchLastUsed(token.id);
    return token;
  }

  /**
   * List all active (non-revoked, non-expired) sessions for a user.
   */
  async getActiveSessions(userId: number): Promise<SessionInfo[]> {
    const sessions =
      await this.refreshTokenRepository.findActiveSessionsByUserId(userId);

    return sessions.map((s) => ({
      sessionIdx: s.idx!,
      deviceId: s.deviceId ?? null,
      lastUsedAt: s.lastUsedAt ?? null,
      createdAt: s.createdAt!,
    }));
  }

  /**
   * Revoke a single session.
   * Returns false if the session does not belong to the user (security check).
   */
  async revokeSession(userId: number, sessionIdx: string): Promise<boolean> {
    return this.refreshTokenRepository.revokeByIdx(sessionIdx, userId);
  }

  /**
   * Revoke all sessions for a user (logout all devices).
   */
  async revokeAllSessions(userId: number): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  /**
   * Hard-delete expired + revoked tokens from the database.
   * Call this from a scheduled job (e.g., daily CRON) to keep table size manageable.
   */
  async cleanupExpiredTokens(): Promise<number> {
    const deleted = await this.refreshTokenRepository.deleteExpired();
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired/revoked refresh tokens.`);
    }
    return deleted;
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
