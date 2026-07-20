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

export class SearchInstrumentsDto {
  /**
   * Search term matched against instrument ticker and name (case-insensitive, partial match)
   * @example 'PAMP'
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;

  /**
   * Max number of instruments to return
   * @example 20
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  /**
   * Number of matching instruments to skip, for pagination
   * @example 0
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
