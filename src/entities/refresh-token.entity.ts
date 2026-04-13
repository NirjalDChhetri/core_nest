import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ type: 'varchar', length: 500, select: false })
  hashedToken!: string;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress?: string | null;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
