import { IBaseRepository } from '@common/interfaces/base-repository.interface';
import { User } from '@entities/user.entity';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  findByIdWithRefreshToken(id: number): Promise<User | null>;
  updateRefreshToken(
    id: number,
    hashedRefreshToken: string | null,
  ): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
