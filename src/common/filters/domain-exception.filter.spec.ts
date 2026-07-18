import { ArgumentsHost } from '@nestjs/common';
import { DomainExceptionFilter } from './domain-exception.filter';
import {
  BusinessRuleException,
  DomainException,
  EntityNotFoundException,
  InvalidInputException,
} from '../exceptions/domain.exceptions';

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ originalUrl: '/api/v1/orders/16/cancel' }),
      }),
    } as unknown as ArgumentsHost;
  });

  const bodyFor = (exception: DomainException) => {
    filter.catch(exception, host);
    const calls = jsonMock.mock.calls as Array<[Record<string, unknown>]>;
    return calls[0][0];
  };

  it('maps EntityNotFoundException to 404 with the standard body shape', () => {
    const body = bodyFor(new EntityNotFoundException('Order', 16));

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Order with ID 16 not found',
      path: '/api/v1/orders/16/cancel',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('maps BusinessRuleException to 409', () => {
    const body = bodyFor(new BusinessRuleException('cannot cancel'));

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'cannot cancel',
    });
  });

  it('maps InvalidInputException to 400', () => {
    const body = bodyFor(new InvalidInputException('bad input'));

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'bad input',
    });
  });
});
