import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../database/enums/order.enum';

export interface OrderResult {
  id: number;
  userId: number;
  instrumentId: number;
  side: OrderSide;
  type: OrderType;
  size: number;
  price: number;
  status: OrderStatus;
  datetime: Date;
}
