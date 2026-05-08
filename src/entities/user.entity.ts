import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { Role } from './role.entity';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  MAGIC_LINK = 'magic_link',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  firstName!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  middleName?: string | null;

  @Column({ type: 'varchar', length: 50 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  password?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true })
  mobileNumber?: string | null;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  lastLogin?: Date | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider!: AuthProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerId?: string | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @OneToMany('UserDevice', 'user')
  devices?: import('./user-device.entity').UserDevice[];

  @OneToMany('RefreshToken', 'user')
  refreshTokens?: import('./refresh-token.entity').RefreshToken[];

  @OneToMany('OtpLog', 'user')
  otpLogs?: import('./otp-log.entity').OtpLog[];
}
