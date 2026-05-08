import type { UserDevice } from '@entities/user-device.entity';
import type { IBaseRepository } from '@common/interfaces/base-repository.interface';

export const DEVICE_REPOSITORY = 'DEVICE_REPOSITORY';

export interface IDeviceRepository extends IBaseRepository<UserDevice> {
  /**
   * Find active (non-deleted) device by user + deviceIdentifier.
   * Used for find-or-create logic (same device across sessions).
   */
  findByUserAndIdentifier(
    userId: number,
    deviceIdentifier: string,
  ): Promise<UserDevice | null>;

  /** All active devices for a user (ordered by lastUsedAt DESC) */
  findAllByUserId(userId: number): Promise<UserDevice[]>;

  /** Mark a device as trusted */
  trustDevice(id: number): Promise<void>;

  /** Revoke trust (untrust) a device */
  untrustDevice(id: number): Promise<void>;

  /** Update IP, user-agent, name, type, and last-used timestamp */
  touchDevice(
    id: number,
    meta: {
      ipAddress?: string;
      userAgent?: string;
      deviceName?: string;
      deviceType?: string;
    },
  ): Promise<void>;
}
