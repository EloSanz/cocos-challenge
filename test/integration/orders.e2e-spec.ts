import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

import { DataSource } from 'typeorm';
import { seedTestData, API_PATHS } from './utils/seed.util';
import { setupTestApp } from './utils/app.util';

describe('OrdersController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = setupTestApp(moduleFixture);
    await app.init();

    // Seed test data
    dataSource = app.get(DataSource);
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it(`${API_PATHS.ORDERS} (POST) - success limit buy`, () => {
    return request(app.getHttpServer())
      .post(API_PATHS.ORDERS)
      .send({
        instrumentId: 2, // AAPL
        userId: 1,
        size: 10,
        price: 150, // 10 * 150 = 1500 (has 10000)
        type: 'LIMIT',
        side: 'BUY',
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body).toHaveProperty('id');
        expect(body.status).toBe('NEW');
        expect(body.price).toBe(150);
      });
  });

  it(`${API_PATHS.ORDERS} (POST) - fails for insufficient funds`, () => {
    return request(app.getHttpServer())
      .post(API_PATHS.ORDERS)
      .send({
        instrumentId: 2,
        userId: 1,
        size: 1000,
        price: 200, // 1000 * 200 = 200000 (only has 10000 - 1500 previous = 8500)
        type: 'LIMIT',
        side: 'BUY',
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body).toHaveProperty('id');
        expect(body.status).toBe('REJECTED');
      });
  });

  it(`${API_PATHS.ORDERS} (POST) - MARKET BUY fills immediately at the LATEST close`, () => {
    // AAPL has two marketdata rows (stale close 100, latest close 200):
    // the fill price must be 200. Cash 8500 >= 10 * 200 -> FILLED.
    return request(app.getHttpServer())
      .post(API_PATHS.ORDERS)
      .send({
        instrumentId: 2,
        userId: 1,
        size: 10,
        type: 'MARKET',
        side: 'BUY',
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body.status).toBe('FILLED');
        expect(body.price).toBe(200);
      });
  });

  it(`${API_PATHS.ORDERS} (POST) - MARKET SELL is REJECTED when shares are insufficient`, () => {
    // Holds 20 AAPL shares (10 seeded + 10 from the MARKET buy above).
    return request(app.getHttpServer())
      .post(API_PATHS.ORDERS)
      .send({
        instrumentId: 2,
        userId: 1,
        size: 100,
        type: 'MARKET',
        side: 'SELL',
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body.status).toBe('REJECTED');
      });
  });

  describe(`${API_PATHS.ORDERS}/:id/cancel (POST)`, () => {
    it('cancels a NEW order, then rejects a second cancel with 409', async () => {
      const created = await request(app.getHttpServer())
        .post(API_PATHS.ORDERS)
        .send({
          instrumentId: 2,
          userId: 1,
          size: 5,
          price: 100,
          type: 'LIMIT',
          side: 'BUY',
        })
        .expect(201);

      const orderId = (created.body as Record<string, any>).id as number;
      expect((created.body as Record<string, any>).status).toBe('NEW');

      await request(app.getHttpServer())
        .post(`${API_PATHS.ORDERS}/${orderId}/cancel`)
        .expect(200)
        .expect((res) => {
          const body = res.body as Record<string, any>;
          expect(body.id).toBe(orderId);
          expect(body.status).toBe('CANCELLED');
        });

      // Cancelling twice must conflict: the order is no longer NEW.
      await request(app.getHttpServer())
        .post(`${API_PATHS.ORDERS}/${orderId}/cancel`)
        .expect(409);
    });

    it('returns 404 for a non-existent order', () => {
      return request(app.getHttpServer())
        .post(`${API_PATHS.ORDERS}/999999/cancel`)
        .expect(404);
    });
  });
});
