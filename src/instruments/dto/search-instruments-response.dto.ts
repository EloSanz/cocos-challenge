import { ApiProperty } from '@nestjs/swagger';
import { InstrumentResponseDto } from './instrument-response.dto';

export class SearchMetaDto {
  @ApiProperty({
    example: 1,
    description: 'Number of instruments in this page',
  })
  count: number;

  @ApiProperty({
    example: 1,
    description:
      'Total number of instruments matching the query, across all pages',
  })
  total: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;

  @ApiProperty({ example: 'PAMP', description: 'Search term that was used' })
  query: string;
}

export class SearchInstrumentsResponseDto {
  @ApiProperty({ type: [InstrumentResponseDto] })
  data: InstrumentResponseDto[];

  @ApiProperty({ type: SearchMetaDto })
  meta: SearchMetaDto;
}
