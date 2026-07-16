import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { OrderResponseDto } from './dto/order-response.dto';

export function ApiCreateOrder() {
  return applyDecorators(
    ApiOperation({
      summary: 'Send a BUY or SELL order (MARKET or LIMIT) to the market',
      description:
        'MARKET orders execute immediately at the latest close price and are FILLED or REJECTED. ' +
        'LIMIT orders are saved as NEW (pending) or REJECTED if funds/shares are insufficient. ' +
        'Send either `size` (exact shares) or `amount` (pesos to invest), never both.',
    }),
    ApiResponse({ status: 201, type: OrderResponseDto }),
    ApiResponse({
      status: 400,
      description: 'Invalid payload or no market data available',
    }),
    ApiResponse({ status: 404, description: 'User or instrument not found' }),
    ApiResponse({
      status: 409,
      description: 'Concurrent modification conflict (resource locked)',
    }),
  );
}

export function ApiCancelOrder() {
  return applyDecorators(
    ApiOperation({ summary: 'Cancel a NEW order' }),
    ApiParam({ name: 'id', example: 42 }),
    ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto }),
    ApiResponse({ status: 404, description: 'Order not found' }),
    ApiResponse({ status: 409, description: 'Order is not in NEW status' }),
  );
}
