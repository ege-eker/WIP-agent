import { AppError } from './base.error';

export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 400);
    this.details = details;
  }
}

export class PathTraversalError extends AppError {
  constructor() {
    super('Path traversal attempt detected', 403);
  }
}
