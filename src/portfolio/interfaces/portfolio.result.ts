/** Application-layer output for a single position (transport-agnostic). */
export interface PositionResult {
  ticker: string;
  name: string;
  shares: number;
  totalValue: number;
  totalReturnPct: number;
  /** Instrument's daily price change: (close - previousClose) / previousClose. */
  dailyReturnPct: number;
}

/** Application-layer output for a user's portfolio (transport-agnostic). */
export interface PortfolioResult {
  totalAccountValue: number;
  availableCash: number;
  positions: PositionResult[];
}
