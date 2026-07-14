import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PortfolioService, PortfolioResponseDto } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get(':userId')
  async getPortfolio(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<PortfolioResponseDto> {
    return this.portfolioService.getUserPortfolio(userId);
  }
}
