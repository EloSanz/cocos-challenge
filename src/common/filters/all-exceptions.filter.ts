import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

/**
 * Fallback filter: keeps Nest's default behavior (generic 500 for unknown
 * errors, untouched HttpExceptions) but logs unexpected infrastructure
 * errors (TypeORM/pg failures, etc.) with their stack and request context,
 * which the default handler swallows silently.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException)) {
      const request = host.switchToHttp().getRequest<Request>();
      const message =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.originalUrl}: ${message}`,
        stack,
      );
    }
    super.catch(exception, host);
  }
}
