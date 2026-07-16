import { OrderSide, OrderType } from '../../database/enums/order.enum';

export interface CreateOrderCommand {
  /** The internal ID of the user creating the order */
  userId: number;

  /** The internal ID of the instrument to trade */
  instrumentId: number;

  /** Whether the order is a BUY or a SELL */
  side: OrderSide;

  /** MARKET (executes immediately at current price) or LIMIT (waits for a specific price) */
  type: OrderType;

  /** The exact number of shares to buy/sell. Mutually exclusive with `amount`. */
  size?: number;

  /** The total amount in cash (fiat) to spend/receive. Mutually exclusive with `size`. */
  amount?: number;

  /** The target price per share. Required ONLY if type is LIMIT. */
  price?: number;
}
