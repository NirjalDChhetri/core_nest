import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDevice } from '@entities/user-device.entity';
import { BaseRepository } from '@common/repositories/base.repository';
import type { IDeviceRepository } from '../interfaces/device-repository.interface';

@Injectable()
export class DeviceRepository
  extends BaseRepository<UserDevice>
  implements IDeviceRepository
{
  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepository: Repository<UserDevice>,
  ) {
    super(deviceRepository);
  }

  async findByUserAndIdentifier(
    userId: number,
    deviceIdentifier: string,
  ): Promise<UserDevice | null> {
    return this.deviceRepository.findOne({
      where: { userId, deviceIdentifier, isDeleted: false },
    });
  }

  async findAllByUserId(userId: number): Promise<UserDevice[]> {
    return this.deviceRepository.find({
      where: { userId, isDeleted: false },
      order: { lastUsedAt: { direction: 'DESC', nulls: 'LAST' } },
    });
  }

  async trustDevice(id: number): Promise<void> {
    await this.deviceRepository.update(id, {
      isTrusted: true,
      trustedAt: new Date(),
    });
  }

  async untrustDevice(id: number): Promise<void> {
    await this.deviceRepository.update(id, {
      isTrusted: false,
      trustedAt: null,
    });
  }

  async touchDevice(
    id: number,
    meta: {
      ipAddress?: string;
      userAgent?: string;
      deviceName?: string;
      deviceType?: string;
    },
  ): Promise<void> {
    await this.deviceRepository.update(id, {
      lastUsedAt: new Date(),
      ...(meta.ipAddress && { ipAddress: meta.ipAddress }),
      ...(meta.userAgent && { userAgent: meta.userAgent }),
      ...(meta.deviceName && { deviceName: meta.deviceName }),
      ...(meta.deviceType && { deviceType: meta.deviceType }),
    });
  }
}
