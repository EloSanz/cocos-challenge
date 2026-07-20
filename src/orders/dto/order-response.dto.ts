import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../database/enums/order.enum';

export class OrderResponseDto {
  /**
   * @example 42
   */
  id: number;

  /**
   * @example 1
   */
  userId: number;

  /**
   * @example 47
   */
  instrumentId: number;

  /**
   * @example OrderSide.BUY
   */
  side: OrderSide;

  /**
   * @example OrderType.MARKET
   */
  type: OrderType;

  /**
   * @example 10
   */
  size: number;

  /**
   * Execution price used for this order, in pesos
   * @example 925.85
   */
  price: number;

  /**
   * @example OrderStatus.FILLED
   */
  status: OrderStatus;

  /**
   * @example '2026-07-14T21:25:41.971Z'
   */
  datetime: Date;
}
