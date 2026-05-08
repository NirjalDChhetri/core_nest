import { Inject, Injectable } from '@nestjs/common';
import {
  DEVICE_REPOSITORY,
  type IDeviceRepository,
} from './interfaces/device-repository.interface';
import type { UserDevice } from '@entities/user-device.entity';
import type { RequestDeviceMeta } from '@common/middleware/device-info.middleware';

@Injectable()
export class DeviceService {
  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly deviceRepository: IDeviceRepository,
  ) {}

  /**
   * Find-or-create a device record for the given user and device metadata.
   *
   * If the client provides a `deviceId` header (X-Device-Id), we look up by
   * (userId, deviceIdentifier). If found, we update the transient fields
   * (IP, UA, name, type, lastUsedAt). If not found, we create a new record.
   *
   * If no deviceId is provided, we create a brand-new device record every time
   * (anonymous device — no deduplication possible).
   */
  async findOrCreateDevice(
    userId: number,
    meta: RequestDeviceMeta,
  ): Promise<UserDevice> {
    const deviceIdentifier = meta.deviceId;

    if (deviceIdentifier) {
      const existing = await this.deviceRepository.findByUserAndIdentifier(
        userId,
        deviceIdentifier,
      );

      if (existing) {
        // Update transient fields (IP and UA may change across sessions)
        await this.deviceRepository.touchDevice(existing.id, {
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          deviceName: meta.deviceName,
          deviceType: meta.deviceType,
        });
        return existing;
      }
    }

    // Create new device record
    const device = this.deviceRepository.create({
      userId,
      deviceIdentifier: deviceIdentifier || crypto.randomUUID(),
      deviceName: meta.deviceName,
      deviceType: meta.deviceType,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      lastUsedAt: new Date(),
    });

    return this.deviceRepository.save(device);
  }

  /** Get all devices for a user */
  async getUserDevices(userId: number): Promise<UserDevice[]> {
    return this.deviceRepository.findAllByUserId(userId);
  }

  /** Mark a device as trusted (skip OTP in future, etc.) */
  async trustDevice(deviceId: number): Promise<void> {
    await this.deviceRepository.trustDevice(deviceId);
  }

  /** Revoke trust from a device */
  async untrustDevice(deviceId: number): Promise<void> {
    await this.deviceRepository.untrustDevice(deviceId);
  }

  /** Soft-delete a device (also removes all its refresh tokens via cascade) */
  async removeDevice(deviceId: number): Promise<void> {
    await this.deviceRepository.delete(deviceId);
  }
}
