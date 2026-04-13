import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { IBaseRepository } from '@common/interfaces/base-repository.interface';

export abstract class BaseRepository<
  T extends ObjectLiteral,
> implements IBaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  create(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async update(id: number, data: DeepPartial<T>): Promise<void> {
    await this.repository.update(id, data as any);
  }

  async delete(id: number): Promise<void> {
    await this.repository.update(id, {
      isDeleted: true,
    } as any);
    await this.repository.softDelete(id);
  }
}
