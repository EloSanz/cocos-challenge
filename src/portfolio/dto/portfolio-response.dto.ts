import { ApiProperty } from '@nestjs/swagger';

export class PositionDto {
  @ApiProperty({ example: 'PAMP' })
  ticker: string;

  @ApiProperty({ example: 'Pampa Holding S.A.' })
  name: string;

  @ApiProperty({ example: 40 })
  shares: number;

  @ApiProperty({
    example: 37034,
    description: 'Current market value of the position, in pesos',
  })
  totalValue: number;

  @ApiProperty({
    example: -0.45,
    description: 'Total return since the position was opened, in %',
  })
  totalReturnPct: number;
}

export class PortfolioResponseDto {
  @ApiProperty({
    example: 889756,
    description: 'Available cash plus the market value of all positions',
  })
  totalAccountValue: number;

  @ApiProperty({ example: 753000, description: 'Pesos available to operate' })
  availableCash: number;

  @ApiProperty({ type: [PositionDto] })
  positions: PositionDto[];
}
