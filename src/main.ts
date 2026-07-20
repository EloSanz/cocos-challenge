import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api');
  // URI versioning: /api/v1/orders, /api/v1/portfolio/:userId, etc.
  // Unversioned routes (health) opt out via `@Controller({ version: VERSION_NEUTRAL })`.
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cocos Challenge API')
    .setDescription(
      'Portfolio, instrument search and order management API for the Cocos backend challenge',
    )
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(
    `Application is running on: ${await app.getUrl()} | NODE_ENV: ${process.env.NODE_ENV || 'development'} | DB_HOST: ${process.env.DB_HOST || 'localhost'}`,
  );
}
void bootstrap();
