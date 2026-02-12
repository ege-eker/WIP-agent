import { Router } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IngestionService } from '../../ingestion/ingestion.service';
import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { ILogger } from '../../core/interfaces/logger.interface';
import { sanitizePath } from '../../utils/path-sanitizer';
import { env } from '../../env';

async function resolveUnicodePath(dir: string, filename: string): Promise<string | null> {
  try {
    const entries = await fs.promises.readdir(dir);
    const nfcFilename = filename.normalize('NFC');
    const nfdFilename = filename.normalize('NFD');

    for (const entry of entries) {
      const entryNfc = entry.normalize('NFC');
      const entryNfd = entry.normalize('NFD');

      if (
        entryNfc === nfcFilename ||
        entryNfd === nfdFilename ||
        entryNfc === nfdFilename ||
        entryNfd === nfcFilename
      ) {
        return path.join(dir, entry);
      }
    }
  } catch {
    // Directory doesn't exist or not accessible
  }
  return null;
}

export function documentsRoutes(
  ingestionService: IngestionService,
  vectorStore: IVectorStore,
  logger: ILogger
): Router {
  const router = Router();

  router.post('/ingest', async (_req, res, next) => {
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

  router.post('/retag', async (_req, res, next) => {
    try {
      logger.info('Starting metadata retag (no re-embedding)');
      const result = await ingestionService.retag();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/', async (req, res, next) => {
    try {
      const documentPath = req.query.path as string;
      if (!documentPath) {
        res.status(400).json({ error: 'Missing "path" query parameter' });
        return;
      }
      logger.info(`Manual document deletion requested: ${documentPath}`);
      const result = await ingestionService.deleteDocument(documentPath);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/open-folder', async (req, res, next) => {
    try {
      const { path: docPath } = req.body as { path?: string };
      if (!docPath) {
        res.status(400).json({ error: 'Missing "path" in request body' });
        return;
      }

      // Normalize Unicode (NFC) to handle Turkish characters like İ, ş, ı
      const normalizedPath = docPath.normalize('NFC');
      let fullPath = sanitizePath(normalizedPath, env.documentsPath);

      // Try stat, with NFC/NFD fallback for Unicode filename mismatches
      let stat = await fs.promises.stat(fullPath).catch(() => null);
      if (!stat) {
        const nfdPath = sanitizePath(docPath.normalize('NFD'), env.documentsPath);
        stat = await fs.promises.stat(nfdPath).catch(() => null);
        if (stat) {
          fullPath = nfdPath;
        } else {
          // Try resolving by scanning the directory for a Unicode-matching entry
          const dir = path.dirname(fullPath);
          const filename = path.basename(fullPath);
          const resolved = await resolveUnicodePath(dir, filename);
          if (resolved) {
            fullPath = resolved;
            stat = await fs.promises.stat(fullPath).catch(() => null);
          }
        }
      }

      if (!stat) {
        res.status(404).json({ error: 'Path not found' });
        return;
      }

      const platform = process.platform;
      let command: string;

      if (stat.isFile()) {
        if (platform === 'win32') {
          command = `explorer.exe /select,"${fullPath}"`;
        } else if (platform === 'darwin') {
          command = `open -R "${fullPath}"`;
        } else {
          command = `xdg-open "${path.dirname(fullPath)}"`;
        }
      } else {
        if (platform === 'win32') {
          command = `explorer.exe "${fullPath}"`;
        } else if (platform === 'darwin') {
          command = `open "${fullPath}"`;
        } else {
          command = `xdg-open "${fullPath}"`;
        }
      }

      exec(command, (err) => {
        if (err && platform !== 'win32') {
          logger.error(`Failed to open folder: ${err.message}`);
          res.status(500).json({ error: 'Failed to open folder' });
          return;
        }
        res.json({ success: true, path: fullPath });
      });
    } catch (err) {
      next(err);
    }
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
