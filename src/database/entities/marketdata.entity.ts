import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Instrument } from './instrument.entity';

import { bigDecimalTransformer } from '../transformers/big-decimal.transformer';
import Big from 'big.js';

@Entity({ name: 'marketdata' })
export class MarketData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: bigDecimalTransformer,
  })
  high: Big;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: bigDecimalTransformer,
  })
  low: Big;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: bigDecimalTransformer,
  })
  open: Big;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: bigDecimalTransformer,
  })
  close: Big;

  @Column({
    name: 'previousclose',
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: bigDecimalTransformer,
  })
  previousClose: Big;

  @Column()
  date: Date;

  @ManyToOne(() => Instrument, (instrument) => instrument.marketData)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;
}
