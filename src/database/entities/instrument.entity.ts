import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from '../entities/order.entity';
import { MarketData } from '../entities/marketdata.entity';

@Entity({ name: 'instruments' })
export class Instrument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticker: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @OneToMany(() => Order, (order) => order.instrument)
  orders: Order[];

  @OneToMany(() => MarketData, (marketData) => marketData.instrument)
  marketData: MarketData[];
}
