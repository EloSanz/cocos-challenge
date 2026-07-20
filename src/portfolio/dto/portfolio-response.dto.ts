export class PositionDto {
  /**
   * @example 'PAMP'
   */
  ticker: string;

  /**
   * @example 'Pampa Holding S.A.'
   */
  name: string;

  /**
   * @example 40
   */
  shares: number;

  /**
   * Current market value of the position, in pesos
   * @example 37034
   */
  totalValue: number;

  /**
   * Total return since the position was opened, in %
   * @example -0.45
   */
  totalReturnPct: number;

  /**
   * Daily return of the instrument (today's close vs the previous close), in %
   * @example 1.54
   */
  dailyReturnPct: number;
}

export class PortfolioResponseDto {
  /**
   * Available cash plus the market value of all positions
   * @example 889756
   */
  totalAccountValue: number;

  /**
   * Pesos available to operate
   * @example 753000
   */
  availableCash: number;

  positions: PositionDto[];
}
