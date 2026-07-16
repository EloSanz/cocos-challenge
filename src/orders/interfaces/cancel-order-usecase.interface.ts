import { OrderResult } from './order.result';

export const ICancelOrderUseCaseToken = 'ICancelOrderUseCase';

export interface ICancelOrderUseCase {
  execute(orderId: number): Promise<OrderResult>;
}
