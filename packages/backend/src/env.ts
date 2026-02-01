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

// Resolve paths relative to the monorepo root (where .env lives), not cwd
const projectRoot = envPath ? path.dirname(envPath) : process.cwd();

export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  chromaCollectionName: process.env.CHROMA_COLLECTION_NAME || 'documents',
  documentsPath: path.resolve(projectRoot, process.env.DOCUMENTS_PATH || './documents'),
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  maxToolCalls: parseInt(process.env.MAX_TOOL_CALLS || '50', 10),
  contextThresholdPercent: parseInt(process.env.CONTEXT_THRESHOLD_PERCENT || '80', 10),
  maxHandoffs: parseInt(process.env.MAX_HANDOFFS || '5', 10),
};
