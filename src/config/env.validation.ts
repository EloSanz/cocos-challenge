import * as Joi from 'joi';
import { ENVIRONMENTS } from '../common/constants/env.constants';

/**
 * Fail-fast validation of environment variables at boot. If a required var is
 * missing or malformed the app refuses to start, instead of silently falling
 * back to insecure defaults (e.g. an empty DB password).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...Object.values(ENVIRONMENTS))
    .default(ENVIRONMENTS.DEVELOPMENT),
  DB_HOST: Joi.string().when('NODE_ENV', {
    is: ENVIRONMENTS.TEST,
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().port().default(5432),
  DB_DATABASE: Joi.string().when('NODE_ENV', {
    is: ENVIRONMENTS.TEST,
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_USERNAME: Joi.string().when('NODE_ENV', {
    is: ENVIRONMENTS.TEST,
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().allow('').when('NODE_ENV', {
    is: ENVIRONMENTS.TEST,
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_SSL: Joi.boolean().default(false),
  PORT: Joi.number().port().default(3000),
});
