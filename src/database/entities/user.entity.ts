import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column({ name: 'accountnumber' })
  accountNumber: string;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
