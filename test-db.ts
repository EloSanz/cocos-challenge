import { DataSource } from 'typeorm';
import { User } from './src/database/entities/user.entity';
import { Instrument } from './src/database/entities/instrument.entity';
import { Order } from './src/database/entities/order.entity';
import { MarketData } from './src/database/entities/marketdata.entity';

const ds = new DataSource({
  type: 'sqlite' as any,
  database: ':memory:',
  entities: [User, Instrument, Order, MarketData],
  synchronize: true
});

ds.initialize()
  .then(() => console.log('Connected!'))
  .catch((err) => console.error('Connection error:', err));
