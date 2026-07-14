import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Instrument } from './instrument.entity';

@Entity({ name: 'marketdata' })
export class MarketData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  high: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  low: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  open: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  close: string;

  @Column({ name: 'previousclose', type: 'numeric', precision: 15, scale: 2 })
  previousClose: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @ManyToOne(() => Instrument, (instrument) => instrument.marketData)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;
}
