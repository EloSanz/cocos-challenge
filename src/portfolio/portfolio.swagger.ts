import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';

export function ApiGetPortfolio() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Get the total account value, available cash and current positions for a user',
    }),
    ApiParam({ name: 'userId', example: 1 }),
    ApiResponse({ status: 200, type: PortfolioResponseDto }),
    ApiResponse({
      status: 404,
      description: 'No portfolio data found for the user',
    }),
  );
}
