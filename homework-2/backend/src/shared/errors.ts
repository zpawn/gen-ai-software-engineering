export interface ValidationDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details: ValidationDetail[] = [],
  ) {
    super(message);
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

export class ParseError extends AppError {
  constructor(message: string, details: ValidationDetail[] = []) {
    super(400, message, details);
    this.name = 'ParseError';
  }
}
