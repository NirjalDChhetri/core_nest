import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { RoleEnum } from '@common/enums';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'enum', enum: RoleEnum, default: RoleEnum.USER })
  role!: RoleEnum;

  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  hashedRefreshToken?: string | null;
}
