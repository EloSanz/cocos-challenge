import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchInstrumentsResponseDto } from './dto/search-instruments-response.dto';

export function ApiSearchInstruments() {
  return applyDecorators(
    ApiOperation({
      summary: 'Search tradable instruments by ticker and/or name',
      description:
        'Case-insensitive partial match on ticker or name. The cash (MONEDA) pseudo-instrument is never returned. ' +
        'Supports `limit`/`offset` pagination.',
    }),
    ApiResponse({ status: 200, type: SearchInstrumentsResponseDto }),
    ApiResponse({
      status: 400,
      description:
        '"q" is missing/too short, or "limit"/"offset" are out of range',
    }),
  );
}
