import type { IBaseRepository } from '@common/interfaces/base-repository.interface';
import type { RefreshToken } from '@entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshToken> {
  findByUserId(userId: number): Promise<RefreshToken[]>;
  findActiveByUserId(userId: number): Promise<RefreshToken | null>;
  revokeAllForUser(userId: number): Promise<void>;
  revokeById(id: number): Promise<void>;
}
