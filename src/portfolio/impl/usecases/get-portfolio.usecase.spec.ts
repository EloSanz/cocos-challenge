import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';
import { GetPortfolioUseCaseImpl } from './get-portfolio.usecase';
import { IPortfolioRepositoryToken } from '../../interfaces/portfolio-repository.interface';
import { EntityNotFoundException } from '../../../common/exceptions/domain.exceptions';
import { ProjectionManager } from '../projection-manager';
import { ZERO } from '../../../common/money';

describe('GetPortfolioUseCaseImpl', () => {
  let useCase: GetPortfolioUseCaseImpl;

  const mockPortfolioRepo = {
    findLatestMarketData: jest.fn(),
    findInstrumentsByIds: jest.fn(),
    hasFilledOrders: jest.fn(),
  };

  const mockProjectionManager = {
    getProjection: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: no instrument metadata unless a test provides it.
    mockPortfolioRepo.findInstrumentsByIds.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPortfolioUseCaseImpl,
        {
          provide: IPortfolioRepositoryToken,
          useValue: mockPortfolioRepo,
        },
        {
          provide: ProjectionManager,
          useValue: mockProjectionManager,
        },
      ],
    }).compile();

    useCase = module.get<GetPortfolioUseCaseImpl>(GetPortfolioUseCaseImpl);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should throw EntityNotFoundException when the user has no activity at all', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: ZERO(),
        positions: new Map(),
      });
      mockPortfolioRepo.hasFilledOrders.mockResolvedValue(false);

      await expect(useCase.execute(1)).rejects.toThrow(EntityNotFoundException);
    });

    it('should return an empty portfolio (not 404) when the user operated but netted to zero', async () => {
      // e.g. CASH_IN then CASH_OUT of everything: no positions, zero cash, but
      // the user did operate — a zeroed portfolio, not a missing one.
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: ZERO(),
        positions: new Map(),
      });
      mockPortfolioRepo.hasFilledOrders.mockResolvedValue(true);

      const result = await useCase.execute(1);

      expect(result.availableCash).toBe(0);
      expect(result.totalAccountValue).toBe(0);
      expect(result.positions).toEqual([]);
      // Empty portfolio skips the enrichment lookups entirely.
      expect(mockPortfolioRepo.findLatestMarketData).not.toHaveBeenCalled();
      expect(mockPortfolioRepo.findInstrumentsByIds).not.toHaveBeenCalled();
    });

    it('should return cash-only portfolio without querying market data or instruments', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: new Big('800'),
        positions: new Map(),
      });
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);

      const result = await useCase.execute(1);

      expect(result.availableCash).toBe(800);
      expect(result.totalAccountValue).toBe(800);
      expect(result.positions.length).toBe(0);
      // No open positions => nothing to look up.
      expect(mockPortfolioRepo.findLatestMarketData).toHaveBeenCalledWith([]);
      expect(mockPortfolioRepo.findInstrumentsByIds).toHaveBeenCalledWith([]);
    });

    it('should calculate positions correctly and scope reads to held instruments', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: new Big('900'),
        positions: new Map([
          [
            2,
            { shares: 10, totalCost: new Big('100'), avgPrice: new Big('10') },
          ],
        ]),
      });
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([
        { instrumentId: 2, close: new Big('15'), previousClose: new Big('10') },
      ]);
      mockPortfolioRepo.findInstrumentsByIds.mockResolvedValue([
        { id: 2, ticker: 'AAPL', name: 'Apple' },
      ]);

      const result = await useCase.execute(1);

      // Reads are scoped to the single held instrument, not the whole market.
      expect(mockPortfolioRepo.findLatestMarketData).toHaveBeenCalledWith([2]);
      expect(mockPortfolioRepo.findInstrumentsByIds).toHaveBeenCalledWith([2]);

      expect(result.availableCash).toBe(900);
      expect(result.positions[0].ticker).toBe('AAPL');
      expect(result.positions[0].name).toBe('Apple');
      // 10 shares * 15 (latest close) = 150
      expect(result.positions[0].totalValue).toBe(150);
      expect(result.positions[0].shares).toBe(10);
      // return = (150 - 100) / 100 = 50%
      expect(result.positions[0].totalReturnPct).toBe(50);
      // daily return = (15 - 10) / 10 = 50%
      expect(result.positions[0].dailyReturnPct).toBe(50);
      // total value = 900 + 150 = 1050
      expect(result.totalAccountValue).toBe(1050);
    });

    it('should fall back to the average price when an instrument has no market data', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: ZERO(),
        positions: new Map([
          [
            2,
            { shares: 10, totalCost: new Big('100'), avgPrice: new Big('10') },
          ],
        ]),
      });
      // No market data at all for instrument 2.
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);
      mockPortfolioRepo.findInstrumentsByIds.mockResolvedValue([
        { id: 2, ticker: 'AAPL', name: 'Apple' },
      ]);

      const result = await useCase.execute(1);

      // Valued at avgPrice (10): 10 shares * 10 = 100, so the return is 0%
      // instead of the whole endpoint failing.
      expect(result.positions[0].totalValue).toBe(100);
      expect(result.positions[0].totalReturnPct).toBe(0);
      // No market data => no daily return either.
      expect(result.positions[0].dailyReturnPct).toBe(0);
    });

    it('should omit closed positions (shares back to zero)', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        // Snapshot may still carry a zero-share entry; it must be filtered out.
        availableCash: new Big('20'),
        positions: new Map([
          [2, { shares: 0, totalCost: ZERO(), avgPrice: new Big('10') }],
        ]),
      });
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);

      const result = await useCase.execute(1);

      expect(result.positions).toEqual([]);
      expect(result.availableCash).toBe(20);
      // A closed position contributes no id to the scoped lookups.
      expect(mockPortfolioRepo.findLatestMarketData).toHaveBeenCalledWith([]);
    });

    it('should compute the return of a short position (gains when price drops)', async () => {
      // Net -10 shares, avgPrice 100.
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: new Big('1000'),
        positions: new Map([
          [
            3,
            {
              shares: -10,
              totalCost: new Big('-1000'),
              avgPrice: new Big('100'),
            },
          ],
        ]),
      });
      // Price dropped from the 100 average to 80.
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([
        {
          instrumentId: 3,
          close: new Big('80'),
          previousClose: new Big('100'),
        },
      ]);
      mockPortfolioRepo.findInstrumentsByIds.mockResolvedValue([
        { id: 3, ticker: 'BMA', name: 'Banco Macro' },
      ]);

      const result = await useCase.execute(1);

      expect(result.positions[0].shares).toBe(-10);
      // Short exposure valued at the current price: -10 * 80 = -800.
      expect(result.positions[0].totalValue).toBe(-800);
      // Short return: (avgPrice - close) / avgPrice = (100 - 80) / 100 = 20%.
      expect(result.positions[0].totalReturnPct).toBe(20);
      // Daily return is the instrument's price move, not position-aware:
      // (close - previousClose) / previousClose = (80 - 100) / 100 = -20%.
      expect(result.positions[0].dailyReturnPct).toBe(-20);
    });

    it('should leave return at 0 when shares > 0 but totalCost is 0 (implicit else)', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: new Big('1000'),
        positions: new Map([
          [4, { shares: 10, totalCost: ZERO(), avgPrice: ZERO() }],
        ]),
      });
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);
      mockPortfolioRepo.findInstrumentsByIds.mockResolvedValue([]);

      const result = await useCase.execute(1);
      expect(result.positions[0].totalReturnPct).toBe(0);
    });

    it('should leave return at 0 when shares < 0 but totalCost is 0 (implicit else)', async () => {
      mockProjectionManager.getProjection.mockResolvedValue({
        availableCash: new Big('1000'),
        positions: new Map([
          [5, { shares: -10, totalCost: ZERO(), avgPrice: ZERO() }],
        ]),
      });
      mockPortfolioRepo.findLatestMarketData.mockResolvedValue([]);
      mockPortfolioRepo.findInstrumentsByIds.mockResolvedValue([]);

      const result = await useCase.execute(1);
      expect(result.positions[0].totalReturnPct).toBe(0);
    });
  });
});
