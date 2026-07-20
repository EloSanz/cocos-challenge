import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProjectionManager } from '../../portfolio/impl/projection-manager';

export class OrderFilledEvent {
  constructor(
    public readonly orderId: number,
    public readonly userId: number,
  ) {}
}

@Injectable()
export class OrderFilledListener {
  private readonly logger = new Logger(OrderFilledListener.name);

  constructor(private readonly projectionManager: ProjectionManager) {}

  @OnEvent(OrderFilledEvent.name)
  async handleOrderFilled(event: OrderFilledEvent): Promise<void> {
    try {
      this.logger.log(
        `Order ${event.orderId} filled. Triggering snapshot update for user ${event.userId}.`,
      );
      await this.projectionManager.updateSnapshot(event.userId);
    } catch (error) {
      this.logger.error(
        `Failed to update snapshot for user ${event.userId}`,
        error,
      );
    }
  }
}
