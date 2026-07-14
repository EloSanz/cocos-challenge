import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffFactor?: number;
}

export function Retry(options: RetryOptions = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const backoffFactor = options.backoffFactor ?? 2;
  const logger = new Logger('RetryDecorator');

  return function <T, A extends unknown[], R>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: A) => Promise<R>>,
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) {
      return descriptor;
    }

    descriptor.value = async function (this: T, ...args: A): Promise<R> {
      let attempt = 0;
      let currentDelay = delayMs;

      while (true) {
        try {
          return await (originalMethod.apply(this, args) as Promise<R>);
        } catch (error: unknown) {
          attempt++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          if (attempt >= maxAttempts) {
            logger.error(
              `Method ${propertyKey} failed after ${attempt} attempts. Error: ${errorMessage}`,
              errorStack,
            );
            throw error;
          }

          logger.warn(
            `Method ${propertyKey} failed (attempt ${attempt}/${maxAttempts}). Retrying in ${currentDelay}ms. Error: ${errorMessage}`,
          );

          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= backoffFactor;
        }
      }
    };

    return descriptor;
  };
}
