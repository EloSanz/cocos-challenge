import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { Order } from '../database/entities/order.entity';
import { Instrument } from '../database/entities/instrument.entity';
import { User } from '../database/entities/user.entity';
import { MarketData } from '../database/entities/marketdata.entity';
import { IOrdersRepositoryToken } from './interfaces/orders-repository.interface';
import { OrdersRepositoryImpl } from './impl/orders-repository.impl';
import { ICreateOrderUseCaseToken } from './interfaces/create-order-usecase.interface';
import { CreateOrderUseCaseImpl } from './impl/usecases/create-order.usecase';
import { ICancelOrderUseCaseToken } from './interfaces/cancel-order-usecase.interface';
import { CancelOrderUseCaseImpl } from './impl/usecases/cancel-order.usecase';
import { KeyedMutex } from '../infrastructure/mutex/keyed-mutex';
import { IMutexToken } from '../common/interfaces/mutex.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Instrument, User, MarketData])],
  controllers: [OrdersController],
  providers: [
    {
      provide: IMutexToken,
      useClass: KeyedMutex,
    },
    {
      provide: IOrdersRepositoryToken,
      useClass: OrdersRepositoryImpl,
    },
    {
      provide: ICreateOrderUseCaseToken,
      useClass: CreateOrderUseCaseImpl,
    },
    {
      provide: ICancelOrderUseCaseToken,
      useClass: CancelOrderUseCaseImpl,
    },
  ],
})
export class OrdersModule {}
