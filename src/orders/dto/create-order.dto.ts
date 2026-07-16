import { IsIn, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSide, OrderType } from '../../database/enums/order.enum';

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty({
    example: 47,
    description: 'Instrument id, see instruments table',
  })
  @IsInt()
  @IsPositive()
  instrumentId: number;

  @ApiProperty({
    enum: [OrderType.MARKET, OrderType.LIMIT],
    example: OrderType.MARKET,
  })
  @IsIn([OrderType.MARKET, OrderType.LIMIT])
  type: OrderType;

  @ApiProperty({
    enum: [OrderSide.BUY, OrderSide.SELL],
    example: OrderSide.BUY,
  })
  @IsIn([OrderSide.BUY, OrderSide.SELL])
  side: OrderSide.BUY | OrderSide.SELL;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Exact number of shares to buy/sell. Mutually exclusive with `amount`; provide exactly one of the two.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  size?: number;

  @ApiPropertyOptional({
    example: 10000,
    description:
      'Total pesos to invest; the service computes the max whole number of shares it can buy/sell (no fractional shares). Mutually exclusive with `size`.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    example: 500.5,
    description:
      'Required for LIMIT orders. Ignored for MARKET orders, which always execute at the latest close price.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;
}
