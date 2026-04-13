import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { User } from '@entities/user.entity';
import { AuthProvider } from '@entities/user.entity';

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

  async findByProviderId(providerId: string): Promise<User | null> {
    return this.userRepository.findByProviderId(providerId);
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findOrCreateOAuthUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    providerId: string;
    provider: AuthProvider;
  }): Promise<User> {
    const existing = await this.userRepository.findByEmailWithProvider(
      data.email,
      data.provider,
    );
    if (existing) {
      return existing;
    }
    const user = this.userRepository.create({
      ...data,
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<[User[], number]> {
    return this.userRepository.findAllPaginated(skip, take);
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async updateProfile(
    userId: number,
    data: Partial<Pick<User, 'firstName' | 'lastName'>>,
  ): Promise<User> {
    await this.userRepository.updateProfile(userId, data);
    return this.findById(userId);
  }

  async deleteAccount(userId: number): Promise<void> {
    await this.userRepository.delete(userId);
  }
}
