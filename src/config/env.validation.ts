import * as Joi from 'joi';

/**
 * Fail-fast validation of environment variables at boot. If a required var is
 * missing or malformed the app refuses to start, instead of silently falling
 * back to insecure defaults (e.g. an empty DB password).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_SSL: Joi.boolean().default(false),
  PORT: Joi.number().port().default(3000),
});
