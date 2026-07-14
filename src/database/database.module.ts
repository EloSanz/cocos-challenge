import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Instrument } from './entities/instrument.entity';
import { Order } from './entities/order.entity';
import { MarketData } from './entities/marketdata.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        database: configService.get<string>('DB_DATABASE'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        ssl: configService.get<boolean>('DB_SSL') ? { rejectUnauthorized: false } : false,
        entities: [User, Instrument, Order, MarketData],
        synchronize: false, // Read-only, no synchronization
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
