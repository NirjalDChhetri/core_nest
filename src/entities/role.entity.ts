import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToMany('User', 'roles')
  users?: import('./user.entity').User[];
}
