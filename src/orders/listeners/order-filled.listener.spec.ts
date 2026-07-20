import { Test, TestingModule } from '@nestjs/testing';
import { OrderFilledListener, OrderFilledEvent } from './order-filled.listener';
import { ProjectionManager } from '../../portfolio/impl/projection-manager';

describe('OrderFilledListener', () => {
  let listener: OrderFilledListener;

  const mockProjectionManager = {
    updateSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderFilledListener,
        {
          provide: ProjectionManager,
          useValue: mockProjectionManager,
        },
      ],
    }).compile();

    listener = module.get<OrderFilledListener>(OrderFilledListener);
  });

  it('should call projectionManager.updateSnapshot and log success', async () => {
    const event = new OrderFilledEvent(10, 1);
    await listener.handleOrderFilled(event);
    expect(mockProjectionManager.updateSnapshot).toHaveBeenCalledWith(1);
  });

  it('should catch and log errors thrown by updateSnapshot', async () => {
    const event = new OrderFilledEvent(10, 1);
    mockProjectionManager.updateSnapshot.mockRejectedValue(
      new Error('Snapshot failed'),
    );

    // The error should be caught internally by the listener
    await expect(listener.handleOrderFilled(event)).resolves.toBeUndefined();
    expect(mockProjectionManager.updateSnapshot).toHaveBeenCalledWith(1);
  });
});
