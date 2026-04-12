import { randomUUID } from 'node:crypto';
import { HelperService } from '@common/helpers/helper.service';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base entity class with common fields for all TypeORM entities
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * The unique id of the entity (UUID)
   */
  @Column({ type: 'uuid', unique: true })
  idx?: string;

  /**
   * To enable or disable the entity
   */
  @Column({ type: 'boolean', default: true })
  isActive? = true;

  /**
   * Marked true when entity is soft deleted
   */
  @Column({ type: 'boolean', default: false })
  isDeleted? = false;

  /**
   * The date that the entity was soft-deleted
   */
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  /**
   * The date that the entity was created
   */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  /**
   * The date that the entity was last updated
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;

  @BeforeInsert()
  generateIdx() {
    if (!this.idx) {
      this.idx = randomUUID();
    }
    const now = HelperService.getTimeInUtc(new Date());
    this.createdAt ??= now;
    this.updatedAt ??= now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = HelperService.getTimeInUtc(new Date());
  }
}
