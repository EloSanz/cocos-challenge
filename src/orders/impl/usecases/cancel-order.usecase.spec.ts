import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';
import {
  BusinessRuleException,
  EntityNotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { CancelOrderUseCaseImpl } from './cancel-order.usecase';
import { IOrdersRepositoryToken } from '../../interfaces/orders-repository.interface';
import type { IOrdersRepository } from '../../interfaces/orders-repository.interface';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../../database/enums/order.enum';
import { Order } from '../../../database/entities/order.entity';

describe('CancelOrderUseCaseImpl', () => {
  let useCase: CancelOrderUseCaseImpl;
  let repo: jest.Mocked<IOrdersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelOrderUseCaseImpl,
        {
          provide: IOrdersRepositoryToken,
          useValue: {
            findOrderById: jest.fn(),
            cancelOrderIfNew: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CancelOrderUseCaseImpl);
    repo = module.get(IOrdersRepositoryToken);
  });

  afterEach(() => jest.clearAllMocks());

  const existingOrder = (status: OrderStatus): Order =>
    ({
      id: 16,
      userId: 1,
      instrumentId: 10,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      size: 10,
      price: new Big('450'),
      status,
      datetime: new Date('2026-07-14T21:25:17.771Z'),
    }) as Order;

  it('cancels a NEW order and returns it with status CANCELLED', async () => {
    repo.findOrderById.mockResolvedValue(existingOrder(OrderStatus.NEW));
    repo.cancelOrderIfNew.mockResolvedValue(true);

    const result = await useCase.execute(16);

    expect(result.status).toBe(OrderStatus.CANCELLED);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.cancelOrderIfNew).toHaveBeenCalledWith(16);
  });

  it('throws EntityNotFoundException when the order does not exist', async () => {
    repo.findOrderById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(EntityNotFoundException);
  });

  it.each([OrderStatus.FILLED, OrderStatus.REJECTED, OrderStatus.CANCELLED])(
    'throws BusinessRuleException without attempting the update when the order is %s',
    async (status) => {
      repo.findOrderById.mockResolvedValue(existingOrder(status));

      await expect(useCase.execute(16)).rejects.toThrow(BusinessRuleException);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.cancelOrderIfNew).not.toHaveBeenCalled();
    },
  );

  it('throws BusinessRuleException when the order stops being NEW between the read and the update (race)', async () => {
    repo.findOrderById
      .mockResolvedValueOnce(existingOrder(OrderStatus.NEW))
      .mockResolvedValueOnce(existingOrder(OrderStatus.FILLED));
    repo.cancelOrderIfNew.mockResolvedValue(false);

    await expect(useCase.execute(16)).rejects.toThrow(BusinessRuleException);
  });
});
