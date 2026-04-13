import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/repositories/base.repository';
import { OtpLog, OtpType } from '@entities/otp-log.entity';
import type { IOtpRepository } from '../interfaces/otp-repository.interface';

@Injectable()
export class OtpRepository
  extends BaseRepository<OtpLog>
  implements IOtpRepository
{
  constructor(
    @InjectRepository(OtpLog)
    private readonly otpRepository: Repository<OtpLog>,
  ) {
    super(otpRepository);
  }

  async findActiveByUserAndType(
    userId: number,
    type: OtpType,
  ): Promise<OtpLog | null> {
    return this.otpRepository
      .createQueryBuilder('otp')
      .where('otp.userId = :userId', { userId })
      .andWhere('otp.type = :type', { type })
      .andWhere('otp.isUsed = false')
      .andWhere('otp.isDeleted = false')
      .andWhere('otp.expiresAt > :now', { now: new Date() })
      .orderBy('otp.createdAt', 'DESC')
      .getOne();
  }

  async invalidateByUserAndType(userId: number, type: OtpType): Promise<void> {
    await this.otpRepository
      .createQueryBuilder()
      .update(OtpLog)
      .set({ isUsed: true })
      .where('userId = :userId', { userId })
      .andWhere('type = :type', { type })
      .andWhere('isUsed = false')
      .execute();
  }
}
