import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentsController } from './instruments.controller';
import { Instrument } from '../database/entities/instrument.entity';
import { IInstrumentsRepositoryToken } from './interfaces/instruments-repository.interface';
import { InstrumentsRepositoryImpl } from './impl/instruments-repository.impl';
import { ISearchInstrumentsUseCaseToken } from './interfaces/search-instruments-usecase.interface';
import { SearchInstrumentsUseCaseImpl } from './impl/usecases/search-instruments.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Instrument])],
  controllers: [InstrumentsController],
  providers: [
    {
      provide: IInstrumentsRepositoryToken,
      useClass: InstrumentsRepositoryImpl,
    },
    {
      provide: ISearchInstrumentsUseCaseToken,
      useClass: SearchInstrumentsUseCaseImpl,
    },
  ],
})
export class InstrumentsModule {}
