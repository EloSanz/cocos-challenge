import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { CreateOrderCommand } from './interfaces/create-order.command';
import { OrderResult } from './interfaces/order.result';

/** Maps the transport DTO to the application command (controller layer). */
export function toCreateOrderCommand(dto: CreateOrderDto): CreateOrderCommand {
  return {
    userId: dto.userId,
    instrumentId: dto.instrumentId,
    type: dto.type,
    side: dto.side,
    size: dto.size,
    amount: dto.amount,
    price: dto.price,
  };
}

/** Maps the application result to the transport response DTO. */
export function toOrderResponseDto(result: OrderResult): OrderResponseDto {
  return {
    id: result.id,
    userId: result.userId,
    instrumentId: result.instrumentId,
    side: result.side,
    type: result.type,
    size: result.size,
    price: result.price,
    status: result.status,
    datetime: result.datetime,
  };
}
