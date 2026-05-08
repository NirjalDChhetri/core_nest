import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { User } from './user.entity';

/**
 * Represents a physical device/browser that a user has logged in from.
 * One row per unique (user_id, device_identifier) combination.
 *
 * Architecture:
 * - Normalized device info — no more duplication across refresh_tokens
 * - Supports "manage your devices" UI (Google/Facebook style)
 * - Supports trusted device marking for reduced friction (skip OTP)
 * - refresh_tokens references this table via device_id FK
 */
@Entity('user_devices')
export class UserDevice extends BaseEntity {
  @Column({ type: 'int' })
  userId!: number;

  /**
   * Client-generated persistent UUID stored in localStorage.
   * Same physical device always sends the same deviceIdentifier via X-Device-Id header.
   * Combined with userId forms a unique device identity.
   */
  @Index()
  @Column({ type: 'uuid' })
  deviceIdentifier!: string;

  /** Human-readable device label: "Chrome on Windows 11" */
  @Column({ type: 'varchar', length: 255 })
  deviceName!: string;

  /** "mobile" | "tablet" | "desktop" | "other" */
  @Column({ type: 'varchar', length: 50 })
  deviceType!: string;

  /** Raw User-Agent string for fingerprinting / auditing */
  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;

  /** Last known IP address used from this device */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress?: string | null;

  /** Most recent activity timestamp on this device */
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date | null;

  /** Marks device as trusted — can skip OTP on future logins */
  @Column({ type: 'boolean', default: false })
  isTrusted!: boolean;

  /** When the device was marked as trusted */
  @Column({ type: 'timestamp', nullable: true })
  trustedAt?: Date | null;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany('RefreshToken', 'device')
  refreshTokens?: import('./refresh-token.entity').RefreshToken[];
}
