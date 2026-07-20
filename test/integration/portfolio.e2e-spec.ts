import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

import { DataSource } from 'typeorm';
import { seedTestData, API_PATHS } from './utils/seed.util';
import { setupTestApp } from './utils/app.util';

import { IPortfolioRepositoryToken } from '../../src/portfolio/interfaces/portfolio-repository.interface';
import type { IPortfolioRepository } from '../../src/portfolio/interfaces/portfolio-repository.interface';
import Big from 'big.js';

describe('PortfolioController (e2e)', () => {
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

    // Mock findLatestMarketData to workaround SQLite lacking DISTINCT ON support
    const portfolioRepo = app.get<IPortfolioRepository>(
      IPortfolioRepositoryToken,
    );
    jest.spyOn(portfolioRepo, 'findLatestMarketData').mockResolvedValue([
      {
        instrumentId: 1,
        close: new Big(1),
        previousClose: new Big(1),
      } as any,
      {
        instrumentId: 2,
        close: new Big(200),
        previousClose: new Big(190),
      } as any,
      {
        instrumentId: 3,
        close: new Big(150),
        previousClose: new Big(145),
      } as any,
      {
        instrumentId: 4,
        close: new Big(1),
        previousClose: new Big(1),
      } as any,
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it(`${API_PATHS.PORTFOLIO}/:userId (GET) - success for seeded user`, () => {
    // Seed: CASH_IN 10000, BUY 10 AAPL @ 150 -> cash 8500.
    // AAPL latest close is 200 (NOT the stale 100 row): value 2000,
    // return (2000 - 1500) / 1500 = 33.33%.
    return request(app.getHttpServer())
      .get(`${API_PATHS.PORTFOLIO}/1`)
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, any>;
        expect(body.availableCash).toBe(8500);
        expect(body.totalAccountValue).toBe(10500);
        expect(body.positions).toEqual([
          {
            ticker: 'AAPL',
            name: 'Apple Inc',
            shares: 10,
            totalValue: 2000,
            totalReturnPct: 33.33,
          },
        ]);
      });
  });

  it(`${API_PATHS.PORTFOLIO}/:userId (GET) - 404 for user with no activity`, () => {
    // User 2 has no orders in the db.sql seed data
    return request(app.getHttpServer())
      .get(`${API_PATHS.PORTFOLIO}/2`)
      .expect(404);
  });

  it(`${API_PATHS.PORTFOLIO}/:userId (GET) - validation error for non-numeric id`, () => {
    return request(app.getHttpServer())
      .get(`${API_PATHS.PORTFOLIO}/invalid`)
      .expect(400);
  });
});
