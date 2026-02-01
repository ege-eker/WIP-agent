import { Router } from 'express';
import { IngestionService } from '../../ingestion/ingestion.service';
import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { ILogger } from '../../core/interfaces/logger.interface';
import { ingestionRateLimiter } from '../middleware/rate-limiter.middleware';

export function documentsRoutes(
  ingestionService: IngestionService,
  vectorStore: IVectorStore,
  logger: ILogger
): Router {
  const router = Router();

  router.post('/ingest', ingestionRateLimiter, async (_req, res, next) => {
    try {
      logger.info('Starting ingestion');
      const result = await ingestionService.ingest();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/ingest/status/:jobId', (req, res) => {
    const status = ingestionService.getJobStatus(req.params.jobId);
    if (!status) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(status);
  });

  router.get('/stats', async (_req, res, next) => {
    try {
      const stats = await vectorStore.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
