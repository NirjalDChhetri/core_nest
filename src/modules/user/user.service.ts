import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { User } from '@entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  async findByIdWithRefreshToken(id: number): Promise<User | null> {
    return this.userRepository.findByIdWithRefreshToken(id);
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async updateRefreshToken(
    id: number,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.userRepository.updateRefreshToken(id, hashedRefreshToken);
  }
}
