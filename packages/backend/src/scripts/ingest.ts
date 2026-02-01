import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function findEnvFile(startDir: string): string | undefined {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const envPath = findEnvFile(process.cwd());
if (envPath) dotenv.config({ path: envPath });

import { WinstonLogger } from '../providers/logger/winston.logger';
import { LocalFilesystemStore } from '../providers/document-store/local-filesystem.store';
import { OpenAIEmbeddingProvider } from '../providers/ai/openai-embedding.provider';
import { ChromaDBStore } from '../providers/vector-store/chromadb.store';
import { IngestionService } from '../ingestion/ingestion.service';

async function main() {
  const logger = new WinstonLogger();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error('OPENAI_API_KEY is required');
    process.exit(1);
  }

  const projectRoot = envPath ? path.dirname(envPath) : process.cwd();
  const documentsPath = path.resolve(projectRoot, process.env.DOCUMENTS_PATH || './documents');
  logger.info(`Documents path: ${documentsPath}`);

  const documentStore = new LocalFilesystemStore(documentsPath);
  const embeddingProvider = new OpenAIEmbeddingProvider(
    apiKey,
    process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
  );
  const vectorStore = new ChromaDBStore(
    process.env.CHROMA_URL || 'http://localhost:8000',
    process.env.CHROMA_COLLECTION_NAME || 'documents',
    logger
  );

  await vectorStore.initialize();

  const ingestionService = new IngestionService(
    documentStore,
    vectorStore,
    embeddingProvider,
    logger
  );

  const result = await ingestionService.ingest();
  logger.info('Ingestion result', result as any);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
