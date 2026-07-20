import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Big from 'big.js';
import {
  EntityNotFoundException,
  InvalidInputException,
} from '../../../common/exceptions/domain.exceptions';
import { toOrderResult } from '../orders-entity.mapper';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../../database/enums/order.enum';
import { Order } from '../../../database/entities/order.entity';
import { IOrdersRepositoryToken } from '../../interfaces/orders-repository.interface';
import type { IOrdersRepository } from '../../interfaces/orders-repository.interface';
import { IMutexToken } from '../../../common/interfaces/mutex.interface';
import type { IMutex } from '../../../common/interfaces/mutex.interface';
import { CreateOrderCommand } from '../../interfaces/create-order.command';
import { OrderResult } from '../../interfaces/order.result';
import { ICreateOrderUseCase } from '../../interfaces/create-order-usecase.interface';
import { OrderFilledEvent } from '../../listeners/order-filled.listener';
import { ProjectionManager } from '../../../portfolio/impl/projection-manager';

@Injectable()
export class CreateOrderUseCaseImpl implements ICreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCaseImpl.name);

  constructor(
    @Inject(IOrdersRepositoryToken)
    private readonly ordersRepo: IOrdersRepository,
    @Inject(IMutexToken)
    private readonly locks: IMutex,
    private readonly eventEmitter: EventEmitter2,
    private readonly projectionManager: ProjectionManager,
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderResult> {
    this.validateCommand(command);
    await this.ensureUserAndInstrumentExist(
      command.userId,
      command.instrumentId,
    );

    const executionPrice = await this.resolveExecutionPrice(command);
    const size = this.resolveSize(command, executionPrice);

    const release = await this.locks.acquire(`user:${command.userId}`);
    let order: Order;

    try {
      const { availableCash, positions } =
        await this.projectionManager.getProjection(command.userId);

      const heldShares: number =
        positions.get(command.instrumentId)?.shares ?? 0;

      const totalAmount: Big = executionPrice.times(size); // executionPrice * size

      const status: OrderStatus = this.determineOrderStatus(
        command,
        size,
        totalAmount,
        availableCash,
        heldShares,
      );

      order = await this.persistOrder(command, size, executionPrice, status);
    } finally {
      await release();
    }

    if (order.status === OrderStatus.FILLED) {
      this.eventEmitter.emit(
        OrderFilledEvent.name,
        new OrderFilledEvent(order.id, order.userId),
      );
    }

    return toOrderResult(order);
  }

  private validateCommand(command: CreateOrderCommand): void {
    if ((command.size == null) === (command.amount == null)) {
      throw new InvalidInputException(
        'Provide exactly one of "size" (number of shares) or "amount" (pesos to invest)',
      );
    }

    if (command.type === OrderType.LIMIT && command.price == null) {
      throw new InvalidInputException('"price" is required for LIMIT orders');
    }
  }

  private async ensureUserAndInstrumentExist(
    userId: number,
    instrumentId: number,
  ): Promise<void> {
    const [user, instrument] = await Promise.all([
      this.ordersRepo.findUserById(userId),
      this.ordersRepo.findInstrumentById(instrumentId),
    ]);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    if (!instrument) {
      throw new EntityNotFoundException('Instrument', instrumentId);
    }
  }

  private async persistOrder(
    command: CreateOrderCommand,
    size: number,
    executionPrice: Big,
    status: OrderStatus,
  ): Promise<Order> {
    return this.ordersRepo.createOrder({
      userId: command.userId,
      instrumentId: command.instrumentId,
      side: command.side,
      type: command.type,
      size,
      price: executionPrice,
      status,
      datetime: new Date(),
    });
  }

  private async resolveExecutionPrice(
    command: CreateOrderCommand,
  ): Promise<Big> {
    if (command.type === OrderType.MARKET) {
      const marketData = await this.ordersRepo.findLatestMarketData(
        command.instrumentId,
      );
      if (!marketData) {
        throw new InvalidInputException(
          `No market data available for instrument ${command.instrumentId}`,
        );
      }
      return marketData.close;
    }

    return new Big(command.price!);
  }

  private resolveSize(
    command: CreateOrderCommand,
    executionPrice: Big,
  ): number {
    if (command.size != null) {
      return command.size;
    }

    const size = new Big(command.amount!)
      .div(executionPrice)
      .round(0, Big.roundDown)
      .toNumber();
    if (size <= 0) {
      throw new InvalidInputException(
        'Amount is too low to buy at least one whole share at the current price',
      );
    }
    return size;
  }

  /**
   * Determines the initial status of the order based on business rules.
   *
   * 1. Validation: BUY orders must be fully funded (cash >= totalAmount).
   *                SELL orders must have sufficient shares (heldShares >= size).
   * 2. Execution:  MARKET orders execute immediately (FILLED).
   *                LIMIT orders wait in the order book (NEW).
   */
  private determineOrderStatus(
    command: CreateOrderCommand,
    size: number,
    totalAmount: Big,
    availableCash: Big,
    heldShares: number,
  ): OrderStatus {
    // Funds/holdings validation applies to BOTH market and limit orders:
    // reject first, decide execution afterwards.
    if (command.side === OrderSide.BUY) {
      if (totalAmount.gt(availableCash)) {
        const msg = `Order REJECTED: User ${command.userId} has insufficient funds to BUY instrument ${command.instrumentId}. Required: ${totalAmount.toString()}, Available: ${availableCash.toString()}`;
        this.logger.warn(msg);
        return OrderStatus.REJECTED;
      }
    } else if (command.side === OrderSide.SELL) {
      if (size > heldShares) {
        const msg = `Order REJECTED: User ${command.userId} has insufficient shares to SELL instrument ${command.instrumentId}. Required: ${size}, Available: ${heldShares}`;
        this.logger.warn(msg);
        return OrderStatus.REJECTED;
      }
    }

    // Passed validation: market orders execute now, limit orders wait in the book.
    return command.type === OrderType.MARKET
      ? OrderStatus.FILLED
      : OrderStatus.NEW;
  }
}
