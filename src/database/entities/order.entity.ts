import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Instrument } from './instrument.entity';
import { OrderSide, OrderStatus } from '../enums/order.enum';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @Column({ name: 'userid' })
  userId: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  size: string; // Size can be stored as decimal/numeric. In NestJS/TypeORM, numeric is usually string.

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  price: string;

  @Column()
  type: string; // MARKET, LIMIT

  @Column({ type: 'enum', enum: OrderSide })
  side: OrderSide;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'timestamp' })
  datetime: Date;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userid' })
  user: User;

  @ManyToOne(() => Instrument, (instrument) => instrument.orders)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;
}
