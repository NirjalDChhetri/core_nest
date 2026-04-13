import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { OtpType } from '@entities/otp-log.entity';
import { OTP_REPOSITORY } from './interfaces/otp-repository.interface';
import type { IOtpRepository } from './interfaces/otp-repository.interface';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject(OTP_REPOSITORY)
    private readonly otpRepository: IOtpRepository,
    private readonly mailerService: MailerService,
  ) {}

  async generateAndSendOtp(
    userId: number,
    email: string,
    type: OtpType,
  ): Promise<void> {
    // Invalidate any pending OTPs of the same type for this user
    await this.otpRepository.invalidateByUserAndType(userId, type);

    // Generate a 6-digit code
    const plainCode = this.generateCode();
    const hashedCode = await bcrypt.hash(plainCode, 12);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const otpLog = this.otpRepository.create({
      code: hashedCode,
      userId,
      type,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });
    await this.otpRepository.save(otpLog);

    const subject = this.getSubject(type);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        text: `Your verification code is: ${plainCode}\nIt expires in ${OTP_TTL_MINUTES} minutes.`,
        html: `<p>Your verification code is: <strong>${plainCode}</strong></p><p>It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${email}`, err);
      // Re-throw in non-production so SMTP misconfigurations surface immediately
      if (process.env.NODE_ENV !== 'production') {
        throw err;
      }
    }
  }

  async verifyOtp(
    userId: number,
    plainCode: string,
    type: OtpType,
  ): Promise<void> {
    const otpLog = await this.otpRepository.findActiveByUserAndType(
      userId,
      type,
    );

    if (!otpLog) {
      throw new BadRequestException({
        message: 'Invalid or expired OTP',
        errors: { otp: ['Invalid or expired OTP'] },
      });
    }

    // Increment attempt counter before verifying
    await this.otpRepository.update(otpLog.id, {
      attempts: otpLog.attempts + 1,
    });

    if (otpLog.attempts + 1 > MAX_ATTEMPTS) {
      await this.otpRepository.update(otpLog.id, { isUsed: true });
      throw new BadRequestException({
        message: 'Too many failed attempts. Request a new code.',
        errors: { otp: ['Too many failed attempts. Request a new code.'] },
      });
    }

    const isValid = await bcrypt.compare(plainCode, otpLog.code);
    if (!isValid) {
      throw new BadRequestException({
        message: 'Invalid or expired OTP',
        errors: { otp: ['Invalid or expired OTP'] },
      });
    }

    // Mark as used on success
    await this.otpRepository.update(otpLog.id, { isUsed: true });
  }

  private generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  private getSubject(type: OtpType): string {
    switch (type) {
      case OtpType.TWO_FACTOR:
        return 'Your login verification code';
      case OtpType.PASSWORD_RESET:
        return 'Your password reset code';
      case OtpType.EMAIL_VERIFY:
        return 'Verify your email address';
    }
  }
}
