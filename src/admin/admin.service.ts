import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { Instrument } from '../database/entities/instrument.entity';
import { MarketData } from '../database/entities/marketdata.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Instrument)
    private readonly instrumentRepository: Repository<Instrument>,
    @InjectRepository(MarketData)
    private readonly marketDataRepository: Repository<MarketData>,
  ) {}

  async deleteOrderById(id: number): Promise<void> {
    this.logger.log(`Deleting order with ID ${id}`);
    await this.orderRepository.delete(id);
  }

  async deleteUserById(id: number): Promise<void> {
    this.logger.log(`Deleting user with ID ${id}`);
    await this.userRepository.delete(id);
  }

  async deleteInstrumentById(id: number): Promise<void> {
    this.logger.log(`Deleting instrument with ID ${id}`);
    await this.instrumentRepository.delete(id);
  }

  async deleteMarketDataById(id: number): Promise<void> {
    this.logger.log(`Deleting market data with ID ${id}`);
    await this.marketDataRepository.delete(id);
  }
}
