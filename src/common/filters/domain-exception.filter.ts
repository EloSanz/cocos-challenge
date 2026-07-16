import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  BusinessRuleException,
  DomainException,
  EntityNotFoundException,
  ResourceLockedException,
} from '../exceptions/domain.exceptions';

interface HttpErrorShape {
  status: HttpStatus;
  error: string;
}

/**
 * Single place where domain exceptions become HTTP responses. The domain
 * classes stay transport-agnostic; the mapping lives here.
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, error } = this.toHttp(exception);

    response.status(status).json({
      statusCode: status,
      error,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private toHttp(exception: DomainException): HttpErrorShape {
    if (exception instanceof EntityNotFoundException) {
      return { status: HttpStatus.NOT_FOUND, error: 'Not Found' };
    }
    if (
      exception instanceof BusinessRuleException ||
      exception instanceof ResourceLockedException
    ) {
      return { status: HttpStatus.CONFLICT, error: 'Conflict' };
    }
    // InvalidInputException and any future uncategorized domain exception.
    return { status: HttpStatus.BAD_REQUEST, error: 'Bad Request' };
  }
}
