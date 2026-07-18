import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupTestApp } from './utils/app.util';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = setupTestApp(moduleFixture);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET) - reports ok with the database up', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body.status).toBe('ok');
        expect(body.details).toHaveProperty('database');
      });
  });
});
