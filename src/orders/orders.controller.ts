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
import { ApiCancelOrder, ApiCreateOrder } from './orders.swagger';

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
  @ApiCreateOrder()
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    const result = await this.createOrderUseCase.execute(
      toCreateOrderCommand(dto),
    );
    return toOrderResponseDto(result);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiCancelOrder()
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    const result = await this.cancelOrderUseCase.execute(id);
    return toOrderResponseDto(result);
  }
}
