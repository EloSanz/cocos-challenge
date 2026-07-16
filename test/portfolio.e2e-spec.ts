import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import Big from 'big.js';
import { AppModule } from '../src/app.module';
import { IPortfolioRepositoryToken } from '../src/portfolio/interfaces/portfolio-repository.interface';

describe('PortfolioController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPortfolioRepo = {
    findFilledOrdersByUser: jest.fn(),
    findLatestMarketData: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IPortfolioRepositoryToken)
      .useValue(mockPortfolioRepo)
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

  it('/api/portfolio/:userId (GET) - success', async () => {
    // Return some mock orders so it doesn't throw 404
    mockPortfolioRepo.findFilledOrdersByUser.mockResolvedValue([
      {
        id: 1,
        instrumentId: 66, // CASH
        userId: 1,
        size: 1000,
        price: new Big('1'),
        side: 'CASH_IN',
        status: 'FILLED',
        type: 'MARKET',
        datetime: new Date(),
        instrument: { ticker: 'ARS', name: 'PESOS', type: 'MONEDA' },
      },
    ]);
    mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);

    return request(app.getHttpServer())
      .get('/api/portfolio/1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('totalAccountValue', 1000);
        expect(res.body).toHaveProperty('availableCash', 1000);
        expect(res.body).toHaveProperty('positions', []);
      });
  });

  it('/api/portfolio/:userId (GET) - not found (404)', async () => {
    // If no orders exist, the service throws EntityNotFoundException
    // which our DomainExceptionFilter translates to a 404
    mockPortfolioRepo.findFilledOrdersByUser.mockResolvedValue([]);

    return request(app.getHttpServer())
      .get('/api/portfolio/999')
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', 404);
        expect(res.body).toHaveProperty('error', 'Not Found');
        expect((res.body as { message: string }).message).toContain(
          'Portfolio for user',
        );
      });
  });

  it('/api/portfolio/:userId (GET) - bad request pipe validation (400)', async () => {
    // userId is expected to be a number (ParseIntPipe)
    return request(app.getHttpServer()).get('/api/portfolio/abc').expect(400);
  });
});
