import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './portfolio.controller';
import { Order } from '../database/entities/order.entity';
import { MarketData } from '../database/entities/marketdata.entity';
import { Instrument } from '../database/entities/instrument.entity';
import { PortfolioSnapshot } from '../database/entities/portfolio-snapshot.entity';
import { IPortfolioRepositoryToken } from './interfaces/portfolio-repository.interface';
import { PortfolioRepositoryImpl } from './impl/portfolio-repository.impl';
import { IGetPortfolioUseCaseToken } from './interfaces/get-portfolio-usecase.interface';
import { GetPortfolioUseCaseImpl } from './impl/usecases/get-portfolio.usecase';
import { ProjectionManager } from './impl/projection-manager';
import { IMutexToken } from '../common/interfaces/mutex.interface';
import { KeyedMutex } from '../infrastructure/mutex/keyed-mutex';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      MarketData,
      Instrument,
      PortfolioSnapshot,
    ]),
  ],
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
    {
      provide: IMutexToken,
      useClass: KeyedMutex,
    },
    ProjectionManager,
  ],
  exports: [ProjectionManager],
})
export class PortfolioModule {}
