import { Injectable } from '@nestjs/common';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
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
    return this.otpRepository.findOne({
      where: {
        userId,
        type,
        isUsed: false,
        isDeleted: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async deletePendingByUserAndType(
    userId: number,
    type: OtpType,
  ): Promise<void> {
    await this.otpRepository.delete({ userId, type, isUsed: false });
  }
}
