import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { Instrument } from '../database/entities/instrument.entity';
import { MarketData } from '../database/entities/marketdata.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Instrument, MarketData])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
