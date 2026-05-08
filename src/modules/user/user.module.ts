import { Module } from '@nestjs/common';
import { User } from '@entities/user.entity';
import { Role } from '@entities/role.entity';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
