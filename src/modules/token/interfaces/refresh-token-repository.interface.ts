import type { IBaseRepository } from '@common/interfaces/base-repository.interface';
import type { RefreshToken } from '@entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshToken> {
  // Lookup by session identifier (idx = jti claim in JWT)
  findActiveByIdx(idx: string): Promise<RefreshToken | null>;
  // Find a revoked (but not deleted) token by idx — used for token reuse detection
  findRevokedByIdx(idx: string): Promise<RefreshToken | null>;
  // All active (non-revoked, non-expired) sessions for a user
  findActiveSessionsByUserId(userId: number): Promise<RefreshToken[]>;
  // Revoke a single session by its idx; returns false if not found or wrong user
  revokeByIdx(idx: string, userId: number): Promise<boolean>;
  // Revoke the active session(s) for a specific device (same-device deduplication)
  revokeByDeviceId(userId: number, deviceId: number): Promise<void>;
  // Revoke every session for a user (logout all devices)
  revokeAllForUser(userId: number): Promise<void>;
  // Stamp last_used_at on a record
  touchLastUsed(id: number): Promise<void>;
  // Hard-delete expired + revoked tokens (cleanup strategy)
  deleteExpired(): Promise<number>;
}
