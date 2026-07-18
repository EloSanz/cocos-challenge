import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import databaseConfig from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

import { ENVIRONMENTS } from './common/constants/env.constants';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true, ttl: 60000 }),
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
    // Note: The order matters. DomainExceptionFilter takes precedence.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).exclude('health').forRoutes('{*path}');
  }
}
