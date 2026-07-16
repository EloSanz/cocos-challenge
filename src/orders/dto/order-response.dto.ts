import { ApiProperty } from '@nestjs/swagger';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../database/enums/order.enum';

export class OrderResponseDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 47 })
  instrumentId: number;

  @ApiProperty({ enum: OrderSide, example: OrderSide.BUY })
  side: OrderSide;

  @ApiProperty({ enum: OrderType, example: OrderType.MARKET })
  type: OrderType;

  @ApiProperty({ example: 10 })
  size: number;

  @ApiProperty({
    example: 925.85,
    description: 'Execution price used for this order, in pesos',
  })
  price: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.FILLED })
  status: OrderStatus;

  @ApiProperty({ example: '2026-07-14T21:25:41.971Z' })
  datetime: Date;
}
