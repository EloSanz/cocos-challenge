import { toCreateOrderCommand, toOrderResponseDto } from './orders.mapper';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResult } from './interfaces/order.result';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../database/enums/order.enum';

describe('orders.mapper', () => {
  it('maps CreateOrderDto to a CreateOrderCommand', () => {
    const dto: CreateOrderDto = {
      userId: 1,
      instrumentId: 47,
      type: OrderType.LIMIT,
      side: OrderSide.BUY,
      size: 10,
      amount: undefined,
      price: 500,
    };

    expect(toCreateOrderCommand(dto)).toEqual({
      userId: 1,
      instrumentId: 47,
      type: OrderType.LIMIT,
      side: OrderSide.BUY,
      size: 10,
      amount: undefined,
      price: 500,
    });
  });

  it('maps an OrderResult to an OrderResponseDto', () => {
    const datetime = new Date('2026-07-14T21:25:41.971Z');
    const result: OrderResult = {
      id: 42,
      userId: 1,
      instrumentId: 47,
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      size: 10,
      price: 925.85,
      status: OrderStatus.FILLED,
      datetime,
    };

    expect(toOrderResponseDto(result)).toEqual({
      id: 42,
      userId: 1,
      instrumentId: 47,
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      size: 10,
      price: 925.85,
      status: OrderStatus.FILLED,
      datetime,
    });
  });
});
