import { ApiProperty } from '@nestjs/swagger';

export class InstrumentResponseDto {
  @ApiProperty({ example: 47 })
  id: number;

  @ApiProperty({ example: 'PAMP' })
  ticker: string;

  @ApiProperty({ example: 'Pampa Holding S.A.' })
  name: string;

  @ApiProperty({ example: 'ACCIONES' })
  type: string;
}
