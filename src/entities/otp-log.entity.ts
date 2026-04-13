import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { User } from './user.entity';

export enum OtpType {
  EMAIL_VERIFY = 'email_verify',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = 'two_factor',
}

@Entity('otp_logs')
export class OtpLog extends BaseEntity {
  @Column({ type: 'varchar', length: 72 })
  code!: string;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.otpLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: OtpType })
  type!: OtpType;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  isUsed!: boolean;

  @Column({ type: 'int', default: 0 })
  attempts!: number;
}
