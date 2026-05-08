import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceService } from './device.service';
import { UserDevice } from '@entities/user-device.entity';
import { DeviceRepository } from './repositories/device.repository';
import { DEVICE_REPOSITORY } from './interfaces/device-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([UserDevice])],
  providers: [
    DeviceService,
    {
      provide: DEVICE_REPOSITORY,
      useClass: DeviceRepository,
    },
  ],
  exports: [DeviceService],
})
export class DeviceModule {}
