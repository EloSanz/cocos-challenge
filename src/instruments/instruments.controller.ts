import { Controller, Get, Inject, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags } from '@nestjs/swagger';
import { SearchInstrumentsDto } from './dto/search-instruments.dto';
import { SearchInstrumentsResponseDto } from './dto/search-instruments-response.dto';
import { toSearchInstrumentsResponseDto } from './instruments.mapper';
import { ISearchInstrumentsUseCaseToken } from './interfaces/search-instruments-usecase.interface';
import type { ISearchInstrumentsUseCase } from './interfaces/search-instruments-usecase.interface';
import { ApiSearchInstruments } from './instruments.swagger';

@ApiTags('instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(
    @Inject(ISearchInstrumentsUseCaseToken)
    private readonly searchInstrumentsUseCase: ISearchInstrumentsUseCase,
  ) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiSearchInstruments()
  async search(
    @Query() dto: SearchInstrumentsDto,
  ): Promise<SearchInstrumentsResponseDto> {
    const result = await this.searchInstrumentsUseCase.execute({
      query: dto.q,
      limit: dto.limit,
      offset: dto.offset,
    });
    return toSearchInstrumentsResponseDto(result);
  }
}
