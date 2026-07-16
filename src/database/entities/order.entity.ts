import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Instrument } from './instrument.entity';
import { OrderSide, OrderStatus } from '../enums/order.enum';

import { bigDecimalTransformer } from '../transformers/big-decimal.transformer';
import Big from 'big.js';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @Column({ name: 'userid' })
  userId: number;

  @Column({ type: 'int' })
  size: number;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: bigDecimalTransformer,
  })
  price: Big;

  @Column()
  type: string; // MARKET, LIMIT

  @Column({ type: 'varchar' })
  side: OrderSide;

  @Column({ type: 'varchar' })
  status: OrderStatus;

  @Column()
  datetime: Date;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userid' })
  user: User;

  @ManyToOne(() => Instrument, (instrument) => instrument.orders)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;
}
