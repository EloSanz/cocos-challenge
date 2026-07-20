import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { bigDecimalTransformer } from '../transformers/big-decimal.transformer';
import Big from 'big.js';

@Entity({ name: 'portfolio_snapshots' })
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userid', unique: true })
  userId: number;

  @Column({ name: 'lastorderid' })
  lastOrderId: number;

  @Column({
    name: 'availablecash',
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: bigDecimalTransformer,
  })
  availableCash: Big;

  /**
   * JSONB column storing the consolidated positions for this user.
   * - Keys: The instrument IDs (stored as strings due to JSON object keys).
   * - Values:
   *    - shares: Total number of shares currently held.
   *    - totalCost: Cumulative cost of the held shares (string to preserve precision).
   *
   * avgPrice is deliberately NOT persisted — it is recomputed as
   * `totalCost / shares` on load (see SnapshotConverter). Storing it would
   * truncate a possibly-repeating decimal to 2dp and drift from the full-scan
   * projection. totalCost, by contrast, is always exact to 2dp.
   */
  @Column({ type: 'jsonb' })
  positions: Record<string, { shares: number; totalCost: string }>;

  @Column({ default: 0 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userid' })
  user: User;
}
