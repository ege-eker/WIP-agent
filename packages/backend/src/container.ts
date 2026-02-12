import { env } from './env';
import { WinstonLogger } from './providers/logger/winston.logger';
import { LocalFilesystemStore } from './providers/document-store/local-filesystem.store';
import { OpenAIProvider } from './providers/ai/openai.provider';
import { OpenAIEmbeddingProvider } from './providers/ai/openai-embedding.provider';
import { ChromaDBStore } from './providers/vector-store/chromadb.store';
import { ContextManagerService } from './agent/context-manager.service';
import { ToolExecutorService } from './agent/tool-executor.service';
import { AgentService } from './agent/agent.service';
import { IngestionService } from './ingestion/ingestion.service';
import { SessionService } from './session/session.service';
import { SessionStore } from './session/session.store';

export async function createContainer() {
  const logger = new WinstonLogger();

  if (!env.openaiApiKey) {
    logger.error('OPENAI_API_KEY is required');
    process.exit(1);
  }

  const documentStore = new LocalFilesystemStore(env.documentsPath);
  const aiProvider = new OpenAIProvider(env.openaiApiKey);
  const embeddingProvider = new OpenAIEmbeddingProvider(env.openaiApiKey, env.openaiEmbeddingModel);
  const vectorStore = new ChromaDBStore(env.chromaUrl, env.chromaCollectionName, logger);

  await vectorStore.initialize();
  logger.info('Vector store initialized');

  const contextManager = new ContextManagerService(aiProvider, env.openaiModel);
  const toolExecutor = new ToolExecutorService(vectorStore, embeddingProvider, documentStore, logger);
  const agentService = new AgentService(aiProvider, contextManager, toolExecutor, {
    maxToolCalls: env.maxToolCalls,
    contextThresholdPercent: env.contextThresholdPercent,
    maxHandoffs: env.maxHandoffs,
    model: env.openaiModel,
  }, logger, env.documentsPath);

  const ingestionService = new IngestionService(documentStore, vectorStore, embeddingProvider, logger);

  const sessionStore = new SessionStore();
  const sessionService = new SessionService(sessionStore);

  return {
    logger,
    documentStore,
    aiProvider,
    embeddingProvider,
    vectorStore,
    contextManager,
    toolExecutor,
    agentService,
    ingestionService,
    sessionService,
  };
}
