import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpLog } from '@entities/otp-log.entity';
import { MailModule } from '@lib/mail/mail.module';
import { OtpService } from './otp.service';
import { OtpRepository } from './repositories/otp.repository';
import { OTP_REPOSITORY } from './interfaces/otp-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([OtpLog]), MailModule],
  providers: [
    OtpService,
    {
      provide: OTP_REPOSITORY,
      useClass: OtpRepository,
    },
  ],
  exports: [OtpService],
})
export class OtpModule {}
