import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { RoleEnum } from '@common/enums';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  MAGIC_LINK = 'magic_link',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  password?: string | null;

  @Column({ type: 'enum', enum: RoleEnum, default: RoleEnum.USER })
  role!: RoleEnum;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider!: AuthProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerId?: string | null;

  @OneToMany('RefreshToken', 'user')
  refreshTokens?: import('./refresh-token.entity').RefreshToken[];

  @OneToMany('OtpLog', 'user')
  otpLogs?: import('./otp-log.entity').OtpLog[];
}
