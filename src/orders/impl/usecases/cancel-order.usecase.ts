import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  EntityNotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { toOrderResult } from '../orders-entity.mapper';
import { OrderStatus } from '../../../database/enums/order.enum';
import { IOrdersRepositoryToken } from '../../interfaces/orders-repository.interface';
import type { IOrdersRepository } from '../../interfaces/orders-repository.interface';
import { OrderResult } from '../../interfaces/order.result';
import { ICancelOrderUseCase } from '../../interfaces/cancel-order-usecase.interface';

@Injectable()
export class CancelOrderUseCaseImpl implements ICancelOrderUseCase {
  constructor(
    @Inject(IOrdersRepositoryToken)
    private readonly ordersRepo: IOrdersRepository,
  ) {}

  async execute(orderId: number): Promise<OrderResult> {
    const order = await this.ordersRepo.findOrderById(orderId);
    if (!order) {
      throw new EntityNotFoundException('Order', orderId);
    }
    if (order.status !== OrderStatus.NEW) {
      throw new BusinessRuleException(
        `Only orders with status NEW can be cancelled (current status: ${order.status})`,
      );
    }

    const cancelled = await this.ordersRepo.cancelOrderIfNew(orderId);
    if (!cancelled) {
      // The order stopped being NEW between the read above and the update
      // (e.g. a concurrent cancel); re-read for an accurate error message.
      const current = await this.ordersRepo.findOrderById(orderId);
      throw new BusinessRuleException(
        `Only orders with status NEW can be cancelled (current status: ${current?.status ?? 'UNKNOWN'})`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    return toOrderResult(order);
  }
}
