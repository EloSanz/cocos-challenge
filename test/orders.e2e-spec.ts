import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

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
});
