import { Order } from '../../database/entities/order.entity';
import { OrderType } from '../../database/enums/order.enum';
import { roundMoney } from '../../common/money';
import { OrderResult } from '../interfaces/order.result';

/** Maps the database entity to the application result (domain layer). */
export function toOrderResult(order: Order): OrderResult {
  return {
    id: order.id,
    userId: order.userId,
    instrumentId: order.instrumentId,
    side: order.side,
    type: order.type as OrderType,
    size: order.size,
    price: roundMoney(order.price),
    status: order.status,
    datetime: order.datetime,
  };
}
