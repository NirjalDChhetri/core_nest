import type { IBaseRepository } from '@common/interfaces/base-repository.interface';
import type { OtpLog, OtpType } from '@entities/otp-log.entity';

export const OTP_REPOSITORY = 'OTP_REPOSITORY';

export interface IOtpRepository extends IBaseRepository<OtpLog> {
  findActiveByUserAndType(
    userId: number,
    type: OtpType,
  ): Promise<OtpLog | null>;
  invalidateByUserAndType(userId: number, type: OtpType): Promise<void>;
}
