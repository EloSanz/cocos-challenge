import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { toCreateOrderCommand, toOrderResponseDto } from './orders.mapper';
import { ICreateOrderUseCaseToken } from './interfaces/create-order-usecase.interface';
import type { ICreateOrderUseCase } from './interfaces/create-order-usecase.interface';
import { ICancelOrderUseCaseToken } from './interfaces/cancel-order-usecase.interface';
import type { ICancelOrderUseCase } from './interfaces/cancel-order-usecase.interface';
import { ApiResponse } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(ICreateOrderUseCaseToken)
    private readonly createOrderUseCase: ICreateOrderUseCase,
    @Inject(ICancelOrderUseCaseToken)
    private readonly cancelOrderUseCase: ICancelOrderUseCase,
  ) {}

  @Post()
  /**
   * Send a BUY or SELL order (MARKET or LIMIT) to the market
   *
   * MARKET orders execute immediately at the latest close price and are FILLED or REJECTED. LIMIT orders are saved as NEW (pending) or REJECTED if funds/shares are insufficient. Send either `size` (exact shares) or `amount` (pesos to invest), never both.
   */
  @ApiResponse({
    status: 400,
    description: 'Invalid payload or no market data available',
  })
  @ApiResponse({ status: 404, description: 'User or instrument not found' })
  @ApiResponse({
    status: 409,
    description: 'Concurrent modification conflict (resource locked)',
  })
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    const result = await this.createOrderUseCase.execute(
      toCreateOrderCommand(dto),
    );
    return toOrderResponseDto(result);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  /**
   * Cancel a NEW order
   */
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Order is not in NEW status' })
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    const result = await this.cancelOrderUseCase.execute(id);
    return toOrderResponseDto(result);
  }
}
