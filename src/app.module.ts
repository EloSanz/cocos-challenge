import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import databaseConfig from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

import { ENVIRONMENTS } from './common/constants/env.constants';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({
          context: 'HTTP',
        }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        genReqId: (req) => {
          return req.headers['x-request-id'] || randomUUID();
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // max 100 requests per minute per IP
      },
    ]),
    // max caps the in-memory store's entry count: the default Keyv store has
    // no bound, and the cache key is the full request URL (querystring
    // included), so unbounded distinct queries would otherwise grow forever.
    CacheModule.register({ isGlobal: true, ttl: 60000, max: 100 }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? ENVIRONMENTS.DEVELOPMENT}`,
        '.env',
      ],
      validationSchema: envValidationSchema,
      load: [databaseConfig],
    }),
    DatabaseModule,
    PortfolioModule,
    OrdersModule,
    InstrumentsModule,
    HealthModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Note: The order matters. DomainExceptionFilter takes precedence.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
