import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';
import { GetPortfolioUseCaseImpl } from './get-portfolio.usecase';
import { IPortfolioRepositoryToken } from '../../interfaces/portfolio-repository.interface';
import { EntityNotFoundException } from '../../../common/exceptions/domain.exceptions';

describe('GetPortfolioUseCaseImpl', () => {
  let useCase: GetPortfolioUseCaseImpl;

  const mockPortfolioRepo = {
    findFilledOrdersByUser: jest.fn(),
    findLatestMarketData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPortfolioUseCaseImpl,
        {
          provide: IPortfolioRepositoryToken,
          useValue: mockPortfolioRepo,
        },
      ],
    }).compile();

    useCase = module.get<GetPortfolioUseCaseImpl>(GetPortfolioUseCaseImpl);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should throw EntityNotFoundException if no orders exist for user', async () => {
      mockPortfolioRepo.findFilledOrdersByUser.mockResolvedValue([]);
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);

      await expect(useCase.execute(1)).rejects.toThrow(EntityNotFoundException);
    });

    it('should calculate available cash correctly (CASH_IN and CASH_OUT)', async () => {
      mockPortfolioRepo.findFilledOrdersByUser.mockResolvedValue([
        {
          side: 'CASH_IN',
          size: 1000,
          price: new Big('1'),
          instrumentId: 66,
          instrument: { type: 'MONEDA' },
        },
        {
          side: 'CASH_OUT',
          size: 200,
          price: new Big('1'),
          instrumentId: 66,
          instrument: { type: 'MONEDA' },
        },
      ]);
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);

      const result = await useCase.execute(1);
      expect(result.availableCash).toBe(800);
      expect(result.totalAccountValue).toBe(800);
      expect(result.positions.length).toBe(0);
    });

    it('should calculate positions correctly', async () => {
      mockPortfolioRepo.findFilledOrdersByUser.mockResolvedValue([
        {
          side: 'CASH_IN',
          size: 1000,
          price: new Big('1'),
          instrumentId: 66,
          instrument: { type: 'MONEDA' },
        },
        {
          side: 'BUY',
          size: 10,
          price: new Big('10'),
          instrumentId: 2,
          instrument: { ticker: 'AAPL', name: 'Apple', type: 'ACCIONES' },
        },
      ]);
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([
        { instrumentId: 2, close: new Big('15'), previousClose: new Big('10') },
      ]);

      const result = await useCase.execute(1);

      // 1000 in, 100 out for buy = 900 cash
      expect(result.availableCash).toBe(900);

      // 10 shares * 15 (latest close) = 150
      expect(result.positions[0].totalValue).toBe(150);
      expect(result.positions[0].shares).toBe(10);

      // return = (150 - 100) / 100 = 50%
      expect(result.positions[0].totalReturnPct).toBe(50);

      // total value = 900 + 150 = 1050
      expect(result.totalAccountValue).toBe(1050);
    });
  });
});
