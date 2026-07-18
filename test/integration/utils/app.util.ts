import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';

// Mirrors the bootstrap in src/main.ts (global prefix + URI versioning).
// Kept in sync manually since e2e specs build the app via TestingModule
// instead of importing bootstrap() directly.
export function setupTestApp(
  moduleFixture: TestingModule,
): INestApplication<App> {
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  return app as INestApplication<App>;
}
