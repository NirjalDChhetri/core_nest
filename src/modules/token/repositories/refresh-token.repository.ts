import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/repositories/base.repository';
import { RefreshToken } from '@entities/refresh-token.entity';
import type { IRefreshTokenRepository } from '../interfaces/refresh-token-repository.interface';

@Injectable()
export class RefreshTokenRepository
  extends BaseRepository<RefreshToken>
  implements IRefreshTokenRepository
{
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {
    super(refreshTokenRepository);
  }

  async findActiveByIdx(idx: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository
      .createQueryBuilder('rt')
      .addSelect('rt.hashedToken')
      .where('rt.idx = :idx', { idx })
      .andWhere('rt.isRevoked = false')
      .andWhere('rt.isDeleted = false')
      .andWhere('rt.expiresAt > :now', { now: new Date() })
      .getOne();
  }

  async findRevokedByIdx(idx: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { idx, isRevoked: true, isDeleted: false },
    });
  }

  async findActiveSessionsByUserId(userId: number): Promise<RefreshToken[]> {
    return this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.userId = :userId', { userId })
      .andWhere('rt.isRevoked = false')
      .andWhere('rt.isDeleted = false')
      .andWhere('rt.expiresAt > :now', { now: new Date() })
      .orderBy('rt.lastUsedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('rt.createdAt', 'DESC')
      .getMany();
  }

  async revokeByIdx(idx: string, userId: number): Promise<boolean> {
    const result = await this.refreshTokenRepository.update(
      { idx, userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), isActive: false },
    );
    return (result.affected ?? 0) > 0;
  }

  async revokeByDeviceId(userId: number, deviceId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, deviceId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), isActive: false },
    );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), isActive: false },
    );
  }

  async touchLastUsed(id: number): Promise<void> {
    await this.refreshTokenRepository.update(id, { lastUsedAt: new Date() });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('isRevoked = true')
      .execute();
    return result.affected ?? 0;
  }
}
