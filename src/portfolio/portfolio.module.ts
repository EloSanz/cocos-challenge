import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './portfolio.controller';
import { Order } from '../database/entities/order.entity';
import { MarketData } from '../database/entities/marketdata.entity';
import { IPortfolioRepositoryToken } from './interfaces/portfolio-repository.interface';
import { PortfolioRepositoryImpl } from './impl/portfolio-repository.impl';
import { IGetPortfolioUseCaseToken } from './interfaces/get-portfolio-usecase.interface';
import { GetPortfolioUseCaseImpl } from './impl/usecases/get-portfolio.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Order, MarketData])],
  controllers: [PortfolioController],
  providers: [
    {
      provide: IPortfolioRepositoryToken,
      useClass: PortfolioRepositoryImpl,
    },
    {
      provide: IGetPortfolioUseCaseToken,
      useClass: GetPortfolioUseCaseImpl,
    },
  ],
})
export class PortfolioModule {}
