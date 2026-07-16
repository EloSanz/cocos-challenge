import { Test, TestingModule } from '@nestjs/testing';
import { SearchInstrumentsUseCaseImpl } from './search-instruments.usecase';
import { IInstrumentsRepositoryToken } from '../../interfaces/instruments-repository.interface';
import type { IInstrumentsRepository } from '../../interfaces/instruments-repository.interface';
import { Instrument } from '../../../database/entities/instrument.entity';

describe('SearchInstrumentsUseCaseImpl', () => {
  let useCase: SearchInstrumentsUseCaseImpl;
  let repo: jest.Mocked<IInstrumentsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchInstrumentsUseCaseImpl,
        {
          provide: IInstrumentsRepositoryToken,
          useValue: {
            search: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(SearchInstrumentsUseCaseImpl);
    repo = module.get(IInstrumentsRepositoryToken);
  });

  afterEach(() => jest.clearAllMocks());

  it('forwards the search term and pagination options to the repository', async () => {
    repo.search.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ query: 'PAMP', limit: 10, offset: 5 });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.search).toHaveBeenCalledWith('PAMP', { limit: 10, offset: 5 });
  });

  it('maps repository instruments to response DTOs inside a data/meta envelope', async () => {
    repo.search.mockResolvedValue({
      items: [
        {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: 'ACCIONES',
        } as Instrument,
      ],
      total: 3,
    });

    const result = await useCase.execute({
      query: 'PAMP',
      limit: 1,
      offset: 0,
    });

    expect(result).toEqual({
      data: [
        {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: 'ACCIONES',
        },
      ],
      meta: { count: 1, total: 3, limit: 1, offset: 0, query: 'PAMP' },
    });
  });

  it('returns an empty data array with count/total 0 when nothing matches', async () => {
    repo.search.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({
      query: 'zzzzz',
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual({
      data: [],
      meta: { count: 0, total: 0, limit: 20, offset: 0, query: 'zzzzz' },
    });
  });
});
