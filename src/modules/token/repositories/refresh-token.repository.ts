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

  async findByUserId(userId: number): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({ where: { userId } });
  }

  async findActiveByUserId(userId: number): Promise<RefreshToken | null> {
    return this.refreshTokenRepository
      .createQueryBuilder('rt')
      .addSelect('rt.hashedToken')
      .where('rt.userId = :userId', { userId })
      .andWhere('rt.isDeleted = false')
      .andWhere('rt.expiresAt > :now', { now: new Date() })
      .orderBy('rt.createdAt', 'DESC')
      .getOne();
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshTokenRepository.update({ userId }, {
      isDeleted: true,
    } as any);
    await this.refreshTokenRepository.softDelete({ userId });
  }

  async revokeById(id: number): Promise<void> {
    await this.refreshTokenRepository.update(id, {
      isDeleted: true,
    } as any);
    await this.refreshTokenRepository.softDelete(id);
  }
}
