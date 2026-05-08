import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { User } from './user.entity';
import { UserDevice } from './user-device.entity';

/**
 * Stores hashed refresh tokens. Each token is tied to a user AND a device.
 * Device info is normalized into user_devices — no duplication here.
 *
 * Key columns:
 * - hashedToken: bcrypt hash of the raw JWT refresh token
 * - deviceId: FK to user_devices.id (which device issued this token)
 * - isRevoked: explicit revocation (token rotation, logout)
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ type: 'varchar', length: 500, select: false })
  hashedToken!: string;

  @Column({ type: 'int' })
  userId!: number;

  /** FK to user_devices.id — the device this session belongs to */
  @Column({ type: 'int', nullable: true })
  deviceId?: number | null;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date | null;

  // Explicit revocation audit — separate from soft-delete (isDeleted)
  @Column({ type: 'boolean', default: false })
  isRevoked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => UserDevice, (device) => device.refreshTokens, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'device_id' })
  device?: UserDevice | null;
}
