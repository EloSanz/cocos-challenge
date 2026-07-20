import { config } from 'dotenv';
import { ENVIRONMENTS } from '../common/constants/env.constants';
config({ path: `.env.${process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT}` });
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Instrument } from './entities/instrument.entity';
import { Order } from './entities/order.entity';
import { MarketData } from './entities/marketdata.entity';

import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';

/**
 * Standalone DataSource used only by the TypeORM CLI for migrations.
 *
 * The NestJS runtime builds its own DataSource via TypeOrmModule.forRootAsync;
 * this mirrors the same connection so `migration:run` / `create` / `revert`
 * work from the command line. It loads env with dotenv because the CLI runs
 * outside Nest's ConfigModule.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_DATABASE || 'neondb',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User, Instrument, Order, MarketData, PortfolioSnapshot],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
