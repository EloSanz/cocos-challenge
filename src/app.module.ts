import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    PortfolioModule,
    OrdersModule,
    InstrumentsModule,
    HealthModule,
  ],
})
export class AppModule {}
