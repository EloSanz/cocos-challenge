import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Instrument } from './entities/instrument.entity';
import { Order } from './entities/order.entity';
import { MarketData } from './entities/marketdata.entity';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password,
          ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
          entities: [User, Instrument, Order, MarketData],
          synchronize: false, // Read-only, no synchronization
          retryAttempts: 10,
          retryDelay: 3000,
          extra: {
            max: 10,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
