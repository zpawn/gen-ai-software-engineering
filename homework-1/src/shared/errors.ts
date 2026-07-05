interface ValidationDetail {
  field: string;
  message: string;
}

/**
 * Application error with HTTP status code.
 * Used for business rule violations and not-found cases.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: ValidationDetail[];

  constructor(statusCode: number, message: string, details: ValidationDetail[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(details: ValidationDetail[]) {
    super(400, 'Validation failed', details);
    this.name = 'ValidationError';
  }
}
