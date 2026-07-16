/**
 * Domain-level exceptions. Deliberately free of any HTTP/framework imports:
 * services throw these, and the DomainExceptionFilter translates them to
 * HTTP responses at the transport boundary.
 */
export abstract class DomainException extends Error {}

/** A referenced entity does not exist. Translated to 404. */
export class EntityNotFoundException extends DomainException {
  constructor(entity: string, id: number | string) {
    super(`${entity} with ID ${id} not found`);
  }
}

/** A business rule was violated (e.g. cancelling a non-NEW order). Translated to 409. */
export class BusinessRuleException extends DomainException {}

/**
 * Input that passes DTO validation but is invalid for the business operation
 * (e.g. size and amount sent together). Translated to 400.
 */
export class InvalidInputException extends DomainException {}

/**
 * Thrown when a resource is already being modified by a concurrent operation.
 * Translated to HTTP 409 (Conflict) by the exception filter.
 */
export class ResourceLockedException extends DomainException {
  constructor(resource: string) {
    super(`${resource} is currently locked by a concurrent operation`);
  }
}
