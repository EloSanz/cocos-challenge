import { CreateOrderCommand } from './create-order.command';
import { OrderResult } from './order.result';

export const ICreateOrderUseCaseToken = 'ICreateOrderUseCase';

export interface ICreateOrderUseCase {
  execute(command: CreateOrderCommand): Promise<OrderResult>;
}
