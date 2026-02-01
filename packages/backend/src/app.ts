import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env';
import { generalRateLimiter } from './api/middleware/rate-limiter.middleware';
import { createErrorHandler } from './api/middleware/error-handler.middleware';
import { healthRoutes } from './api/routes/health.routes';
import { chatRoutes } from './api/routes/chat.routes';
import { documentsRoutes } from './api/routes/documents.routes';
import { AgentService } from './agent/agent.service';
import { SessionService } from './session/session.service';
import { IngestionService } from './ingestion/ingestion.service';
import { IVectorStore } from './core/interfaces/vector-store.interface';
import { ILogger } from './core/interfaces/logger.interface';

export function createApp(deps: {
  agentService: AgentService;
  sessionService: SessionService;
  ingestionService: IngestionService;
  vectorStore: IVectorStore;
  logger: ILogger;
}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(generalRateLimiter);

  app.use('/api/health', healthRoutes());
  app.use('/api/chat', chatRoutes(deps.agentService, deps.sessionService, deps.logger));
  app.use('/api/documents', documentsRoutes(deps.ingestionService, deps.vectorStore, deps.logger));

  app.use(createErrorHandler(deps.logger));

  return app;
}
