import type { IBaseRepository } from '@common/interfaces/base-repository.interface';
import type { User, AuthProvider } from '@entities/user.entity';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  findByEmailWithProvider(
    email: string,
    provider: AuthProvider,
  ): Promise<User | null>;
  findByProviderId(providerId: string): Promise<User | null>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
  updateProfile(
    userId: number,
    data: Partial<Pick<User, 'firstName' | 'lastName'>>,
  ): Promise<void>;
  findAllPaginated(skip: number, take: number): Promise<[User[], number]>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';
