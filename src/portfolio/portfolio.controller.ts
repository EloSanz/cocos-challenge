import { Controller, Get, Param, ParseIntPipe, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { toPortfolioResponseDto } from './portfolio.mapper';
import { IGetPortfolioUseCaseToken } from './interfaces/get-portfolio-usecase.interface';
import type { IGetPortfolioUseCase } from './interfaces/get-portfolio-usecase.interface';
import { ApiGetPortfolio } from './portfolio.swagger';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(
    @Inject(IGetPortfolioUseCaseToken)
    private readonly getPortfolioUseCase: IGetPortfolioUseCase,
  ) {}

  @Get(':userId')
  @ApiGetPortfolio()
  async getPortfolio(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<PortfolioResponseDto> {
    const result = await this.getPortfolioUseCase.execute(userId);
    return toPortfolioResponseDto(result);
  }
}
