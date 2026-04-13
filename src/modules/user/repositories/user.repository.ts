import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/repositories/base.repository';
import { User, AuthProvider } from '@entities/user.entity';
import { IUserRepository } from '../interfaces/user-repository.interface';

@Injectable()
export class UserRepository
  extends BaseRepository<User>
  implements IUserRepository
{
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByEmailWithProvider(
    email: string,
    provider: AuthProvider,
  ): Promise<User | null> {
    return this.userRepository.findOne({ where: { email, provider } });
  }

  async findByProviderId(providerId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { providerId } });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async updateProfile(
    userId: number,
    data: Partial<Pick<User, 'firstName' | 'lastName'>>,
  ): Promise<void> {
    await this.userRepository.update(userId, data);
  }

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }
}
