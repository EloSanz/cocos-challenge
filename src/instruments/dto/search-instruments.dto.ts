import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchInstrumentsDto {
  @ApiProperty({
    example: 'PAMP',
    description:
      'Search term matched against instrument ticker and name (case-insensitive, partial match)',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Max number of instruments to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    minimum: 0,
    description: 'Number of matching instruments to skip, for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
