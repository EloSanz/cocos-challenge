import { toPortfolioResponseDto } from './portfolio.mapper';
import { PortfolioResult } from './interfaces/portfolio.result';

describe('portfolio.mapper', () => {
  it('maps a PortfolioResult to a PortfolioResponseDto including nested positions', () => {
    const result: PortfolioResult = {
      totalAccountValue: 889756,
      availableCash: 753000,
      positions: [
        {
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          shares: 40,
          totalValue: 37034,
          totalReturnPct: -0.45,
          dailyReturnPct: 1.54,
        },
      ],
    };

    expect(toPortfolioResponseDto(result)).toEqual({
      totalAccountValue: 889756,
      availableCash: 753000,
      positions: [
        {
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          shares: 40,
          totalValue: 37034,
          totalReturnPct: -0.45,
          dailyReturnPct: 1.54,
        },
      ],
    });
  });

  it('maps an empty positions list', () => {
    const result: PortfolioResult = {
      totalAccountValue: 1000,
      availableCash: 1000,
      positions: [],
    };

    expect(toPortfolioResponseDto(result).positions).toEqual([]);
  });
});
