import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { PortfolioResult } from './interfaces/portfolio.result';

/** Maps the application result to the transport response DTO. */
export function toPortfolioResponseDto(
  result: PortfolioResult,
): PortfolioResponseDto {
  return {
    totalAccountValue: result.totalAccountValue,
    availableCash: result.availableCash,
    positions: result.positions.map((pos) => ({
      ticker: pos.ticker,
      name: pos.name,
      shares: pos.shares,
      totalValue: pos.totalValue,
      totalReturnPct: pos.totalReturnPct,
      dailyReturnPct: pos.dailyReturnPct,
    })),
  };
}
