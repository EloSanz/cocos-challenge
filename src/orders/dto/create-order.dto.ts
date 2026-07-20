import { IsIn, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderSide, OrderType } from '../../database/enums/order.enum';

export class CreateOrderDto {
  /**
   * @example 1
   */
  @IsInt()
  @IsPositive()
  userId: number;

  /**
   * Instrument id, see instruments table
   * @example 47
   */
  @IsInt()
  @IsPositive()
  instrumentId: number;

  /**
   * @example OrderType.MARKET
   */
  @IsIn([OrderType.MARKET, OrderType.LIMIT])
  type: OrderType;

  /**
   * @example OrderSide.BUY
   */
  @IsIn([OrderSide.BUY, OrderSide.SELL])
  side: OrderSide.BUY | OrderSide.SELL;

  /**
   * Exact number of shares to buy/sell. Mutually exclusive with `amount`; provide exactly one of the two.
   * @example 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  size?: number;

  /**
   * Total pesos to invest; the service computes the max whole number of shares it can buy/sell (no fractional shares). Mutually exclusive with `size`.
   * @example 10000
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  /**
   * Required for LIMIT orders. Ignored for MARKET orders, which always execute at the latest close price.
   * @example 500.5
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;
}
