import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { HealthModule } from './health/health.module';
import databaseConfig from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      validationSchema: envValidationSchema,
      load: [databaseConfig],
    }),
    DatabaseModule,
    PortfolioModule,
    OrdersModule,
    InstrumentsModule,
    HealthModule,
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
