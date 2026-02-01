import { AppError } from './base.error';

export class AIProviderError extends AppError {
  constructor(message: string) {
    super(`AI provider error: ${message}`, 502);
  }
}

export class ContextOverflowError extends AppError {
  constructor() {
    super('Context window overflow - max handoffs reached', 500);
  }
}

export class MaxToolCallsError extends AppError {
  constructor(limit: number) {
    super(`Maximum tool call limit reached: ${limit}`, 500);
  }
}
