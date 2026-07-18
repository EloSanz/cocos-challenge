import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { Order } from '../../src/database/entities/order.entity';
import { seedTestData } from './utils/seed.util';
import { setupTestApp } from './utils/app.util';

const ADMIN_PATH = '/api/admin';
const TEST_SECRET = 'supersecret123';

describe('AdminController (e2e)', () => {
  let app: INestApplication<App>;
  let orderRepository: Repository<Order>;
  const originalSecret = process.env.ADMIN_SECRET_KEY;

  beforeAll(async () => {
    // Set before the module compiles so ConfigService picks it up.
    process.env.ADMIN_SECRET_KEY = TEST_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Same bootstrap as every other e2e suite: /api prefix + global pipes.
    // Filters are already registered via APP_FILTER in AppModule.
    app = setupTestApp(moduleFixture);
    await app.init();

    await seedTestData(app.get(DataSource));
    orderRepository = moduleFixture.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
  });

  afterAll(async () => {
    if (originalSecret === undefined) {
      delete process.env.ADMIN_SECRET_KEY;
    } else {
      process.env.ADMIN_SECRET_KEY = originalSecret;
    }
    await app.close();
  });

  it(`${ADMIN_PATH}/orders/:id (DELETE) - 401 if x-api-key is missing`, () => {
    return request(app.getHttpServer())
      .delete(`${ADMIN_PATH}/orders/1`)
      .expect(401);
  });

  it(`${ADMIN_PATH}/orders/:id (DELETE) - 401 if x-api-key is wrong`, () => {
    return request(app.getHttpServer())
      .delete(`${ADMIN_PATH}/orders/1`)
      .set('x-api-key', 'wrong-key')
      .expect(401);
  });

  it(`${ADMIN_PATH}/orders/:id (DELETE) - deletes ONLY the targeted order with the correct key`, async () => {
    const before = await orderRepository.count();
    expect(before).toBeGreaterThan(0); // guard against a vacuous pass

    await request(app.getHttpServer())
      .delete(`${ADMIN_PATH}/orders/1`)
      .set('x-api-key', TEST_SECRET)
      .expect(204);

    expect(await orderRepository.findOneBy({ id: 1 })).toBeNull();
    expect(await orderRepository.count()).toBe(before - 1);
  });

  it(`${ADMIN_PATH} (DELETE) - 401 in production even with the correct key`, async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer())
        .delete(`${ADMIN_PATH}/orders/2`)
        .set('x-api-key', TEST_SECRET)
        .expect(401);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
