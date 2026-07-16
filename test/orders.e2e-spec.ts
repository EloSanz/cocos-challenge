import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import Big from 'big.js';
import { AppModule } from '../src/app.module';
import { IOrdersRepositoryToken } from '../src/orders/interfaces/orders-repository.interface';
import {
  OrderSide,
  OrderType,
  OrderStatus,
} from '../src/database/enums/order.enum';

describe('OrdersController (e2e)', () => {
  let app: INestApplication<App>;

  const mockOrdersRepo = {
    findUserById: jest.fn(),
    findInstrumentById: jest.fn(),
    findFilledOrdersByUser: jest.fn(),
    findLatestMarketData: jest.fn(),
    createOrder: jest.fn(),
    findOrderById: jest.fn(),
    cancelOrderIfNew: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IOrdersRepositoryToken)
      .useValue(mockOrdersRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/orders', () => {
    it('should return 400 for bad requests (validation)', async () => {
      return request(app.getHttpServer())
        .post('/api/orders')
        .send({
          // Missing required fields
          type: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should create an order successfully', async () => {
      mockOrdersRepo.findUserById.mockResolvedValue({ id: 1 });
      mockOrdersRepo.findInstrumentById.mockResolvedValue({
        id: 2,
        type: 'ACCIONES',
      });
      // Give the user some cash
      mockOrdersRepo.findFilledOrdersByUser.mockResolvedValue([
        {
          side: OrderSide.CASH_IN,
          size: 1000,
          price: new Big('1'),
          instrumentId: 66,
          instrument: { ticker: 'ARS', name: 'PESOS', type: 'MONEDA' },
        },
      ]);
      mockOrdersRepo.findLatestMarketData.mockResolvedValue({
        close: new Big('10'),
      });
      mockOrdersRepo.createOrder.mockResolvedValue({
        id: 100,
        userId: 1,
        instrumentId: 2,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
        price: new Big('10'),
        status: OrderStatus.NEW,
        datetime: new Date(),
      });

      return request(app.getHttpServer())
        .post('/api/orders')
        .send({
          userId: 1,
          instrumentId: 2,
          type: OrderType.MARKET,
          side: OrderSide.BUY,
          size: 10,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 100);
          expect(res.body).toHaveProperty('status', OrderStatus.NEW);
        });
    });

    it('should return 404 if user not found', async () => {
      mockOrdersRepo.findUserById.mockResolvedValue(null);
      mockOrdersRepo.findInstrumentById.mockResolvedValue({
        id: 2,
        type: 'ACCIONES',
      });

      return request(app.getHttpServer())
        .post('/api/orders')
        .send({
          userId: 999,
          instrumentId: 2,
          type: OrderType.MARKET,
          side: OrderSide.BUY,
          size: 10,
        })
        .expect(404);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should return 404 if order does not exist', async () => {
      mockOrdersRepo.findOrderById.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/api/orders/999/cancel')
        .expect(404);
    });

    it('should return 409 if order is not NEW', async () => {
      mockOrdersRepo.findOrderById.mockResolvedValue({
        id: 1,
        status: OrderStatus.FILLED,
      });

      return request(app.getHttpServer())
        .post('/api/orders/1/cancel')
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('error', 'Conflict');
        });
    });

    it('should cancel the order if NEW', async () => {
      mockOrdersRepo.findOrderById.mockResolvedValue({
        id: 1,
        userId: 1,
        instrumentId: 2,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 10,
        price: new Big('450'),
        status: OrderStatus.NEW,
        datetime: new Date(),
      });
      mockOrdersRepo.cancelOrderIfNew.mockResolvedValue(true);

      return request(app.getHttpServer())
        .post('/api/orders/1/cancel')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 1);
          expect(res.body).toHaveProperty('status', OrderStatus.CANCELLED);
        });
    });
  });
});
