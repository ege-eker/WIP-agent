import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/base.error';
import { ILogger } from '../../core/interfaces/logger.interface';

export function createErrorHandler(logger: ILogger) {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode });
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  };
}
