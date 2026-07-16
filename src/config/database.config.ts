import { registerAs } from '@nestjs/config';

/**
 * Env vars are validated at boot by `envValidationSchema`, so there are no
 * insecure fallbacks here (a missing DB_PASSWORD must fail startup, not
 * silently connect with an empty password).
 */
export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
}));
