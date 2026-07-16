import { PortfolioResult } from './portfolio.result';

export interface IGetPortfolioUseCase {
  execute(userId: number): Promise<PortfolioResult>;
}

export const IGetPortfolioUseCaseToken = 'IGetPortfolioUseCase';
