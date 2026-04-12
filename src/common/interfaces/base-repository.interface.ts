import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
} from 'typeorm';

export interface IBaseRepository<T extends ObjectLiteral = ObjectLiteral> {
  create(data: DeepPartial<T>): T;
  save(entity: T): Promise<T>;
  findOne(options: FindOneOptions<T>): Promise<T | null>;
  find(options?: FindManyOptions<T>): Promise<T[]>;
  update(id: number, data: DeepPartial<T>): Promise<void>;
  delete(id: number): Promise<void>;
}
