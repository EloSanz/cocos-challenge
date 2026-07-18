import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

import { DataSource } from 'typeorm';
import { seedTestData, API_PATHS } from './utils/seed.util';
import { setupTestApp } from './utils/app.util';

describe('InstrumentsController (e2e)', () => {
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

  it(`${API_PATHS.INSTRUMENTS} (GET) - search by ticker`, () => {
    return request(app.getHttpServer())
      .get(`${API_PATHS.INSTRUMENTS}?q=GGAL`)
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('meta');

        const data = body.data as Array<Record<string, unknown>>;
        expect(Array.isArray(data)).toBeTruthy();
        expect(data.length).toBeGreaterThan(0);
        expect(data[0]).toHaveProperty('id');
        expect(data[0].ticker).toBe('GGAL');
      });
  });

  it(`${API_PATHS.INSTRUMENTS} (GET) - missing query`, () => {
    return request(app.getHttpServer()).get(API_PATHS.INSTRUMENTS).expect(400);
  });
});
