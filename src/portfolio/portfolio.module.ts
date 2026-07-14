import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PortfolioRepository } from './portfolio.repository';
import { Order } from '../database/entities/order.entity';
import { MarketData } from '../database/entities/marketdata.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, MarketData])],
  controllers: [PortfolioController],
  providers: [PortfolioService, PortfolioRepository],
})
export class PortfolioModule {}
