import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { IDocumentStore } from '../core/interfaces/document-store.interface';
import { IVectorStore } from '../core/interfaces/vector-store.interface';
import { IEmbeddingProvider } from '../core/interfaces/embedding-provider.interface';
import { ILogger } from '../core/interfaces/logger.interface';
import { DocumentChunk, SupportedFileType } from '../core/types/document.types';
import { ParserFactory } from '../providers/document-parser/parser-factory';
import { FileDiscoveryService } from './file-discovery.service';
import { MetadataExtractorService } from './metadata-extractor.service';
import { ChunkingService } from './chunking.service';
import { IngestionStateService } from './ingestion-state.service';
import { StructureAnalyzerService } from './structure-analyzer.service';

export interface IngestionProgress {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  cleanedFiles: number;
  errors: string[];
}

export class IngestionService {
  private fileDiscovery: FileDiscoveryService;
  private metadataExtractor: MetadataExtractorService;
  private chunking: ChunkingService;
  private parserFactory: ParserFactory;
  private ingestionState: IngestionStateService;
  private structureAnalyzer: StructureAnalyzerService;
  private activeJobs = new Map<string, IngestionProgress>();

  constructor(
    private documentStore: IDocumentStore,
    private vectorStore: IVectorStore,
    private embeddingProvider: IEmbeddingProvider,
    private logger: ILogger
  ) {
    this.fileDiscovery = new FileDiscoveryService(documentStore);
    this.metadataExtractor = new MetadataExtractorService();
    this.chunking = new ChunkingService();
    this.parserFactory = new ParserFactory();
    this.ingestionState = new IngestionStateService(documentStore.getBasePath());
    this.structureAnalyzer = new StructureAnalyzerService();
  }

  private async cleanOrphanedDocuments(progress: IngestionProgress): Promise<void> {
    // Use ChromaDB as the source of truth — ingestion state may be missing
    const chromaPaths = await this.vectorStore.getAllDocumentPaths();
    const statePaths = this.ingestionState.getIndexedPaths();
    const allPaths = new Set([...chromaPaths, ...statePaths]);

    this.logger.info(`Checking ${allPaths.size} indexed paths for orphaned documents`);

    for (const filePath of allPaths) {
      try {
        const fileExists = await this.documentStore.exists(filePath);
        if (!fileExists) {
          this.logger.info(`Orphaned document detected, cleaning up: ${filePath}`);
          await this.vectorStore.deleteDocument(filePath);
          this.ingestionState.removePath(filePath);
          progress.cleanedFiles++;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        progress.errors.push(`Cleanup failed for ${filePath}: ${errMsg}`);
        this.logger.error(`Failed to clean orphaned document: ${filePath}`, { error: errMsg });
      }
    }

    if (progress.cleanedFiles > 0) {
      this.logger.info(`Cleaned ${progress.cleanedFiles} orphaned documents`);
    }
  }

  async ingest(): Promise<IngestionProgress> {
    const jobId = uuidv4();
    const progress: IngestionProgress = {
      jobId,
      status: 'running',
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      cleanedFiles: 0,
      errors: [],
    };
    this.activeJobs.set(jobId, progress);

    try {
      await this.ingestionState.load();

      // Clean up chunks for files that no longer exist on disk
      await this.cleanOrphanedDocuments(progress);

      const files = await this.fileDiscovery.discoverFiles();
      progress.totalFiles = files.length;
      this.logger.info(`Discovered ${files.length} files for ingestion`);

      // Analyze folder structure and persist profile
      const profile = this.structureAnalyzer.analyze(files, this.documentStore.getBasePath());
      await this.ingestionState.saveProfile(profile);
      this.logger.info(`Folder structure profile: ${profile.pattern}`, {
        categories: profile.categories.length,
        years: profile.years.length,
        maxDepth: profile.maxDepth,
      });

      for (const file of files) {
        try {
          if (!this.ingestionState.needsReindex(file.path, file.sizeBytes, file.modifiedAt)) {
            progress.skippedFiles++;
            this.logger.debug(`Skipping unchanged file: ${file.filename}`);
            continue;
          }

          // Delete existing chunks if re-indexing
          await this.vectorStore.deleteDocument(file.path);

          const ext = path.extname(file.filename).toLowerCase().slice(1) as SupportedFileType;
          const parser = this.parserFactory.getParser(ext);
          const buffer = await this.documentStore.readFile(file.path);
          const parsed = await parser.parse(buffer, file.filename);

          const metadata = this.metadataExtractor.extract(file.path, this.documentStore.getBasePath(), profile);
          const textChunks = this.chunking.chunk(parsed.content);

          if (textChunks.length === 0) {
            this.logger.warn(`No content found in: ${file.filename}`);
            progress.skippedFiles++;
            continue;
          }

          const chunks: DocumentChunk[] = textChunks.map((tc) => ({
            id: uuidv4(),
            documentPath: file.path,
            chunkIndex: tc.chunkIndex,
            content: tc.content,
            metadata: {
              filename: file.filename,
              path: file.path,
              year: metadata.year,
              category: metadata.category,
              fileType: ext,
              sizeBytes: file.sizeBytes,
              chunkCount: textChunks.length,
              indexedAt: new Date().toISOString(),
            },
          }));

          // Batch embed - smaller batches to avoid token limits
          const batchSize = 10;
          for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const texts = batch.map((c) => c.content);
            const embeddings = await this.embeddingProvider.embedBatch(texts);
            await this.vectorStore.addDocuments(batch, embeddings);
          }

          this.ingestionState.markIndexed(file.path, file.sizeBytes, file.modifiedAt);
          progress.processedFiles++;
          this.logger.info(`Indexed: ${file.filename} (${textChunks.length} chunks)`);
        } catch (err) {
          progress.failedFiles++;
          const errMsg = err instanceof Error ? err.message : String(err);
          progress.errors.push(`${file.filename}: ${errMsg}`);
          this.logger.error(`Failed to index: ${file.filename}`, { error: errMsg });
        }
      }

      // Retag ALL existing documents with the new profile (covers skipped files too)
      if (progress.skippedFiles > 0) {
        const chromaPaths = await this.vectorStore.getAllDocumentPaths();
        let retagged = 0;
        for (const docPath of chromaPaths) {
          const meta = this.metadataExtractor.extract(docPath, this.documentStore.getBasePath(), profile);
          const updated = await this.vectorStore.updateDocumentMetadata(docPath, {
            year: meta.year || '',
            category: meta.category || '',
          });
          if (updated > 0) retagged++;
        }
        this.logger.info(`Retagged ${retagged} existing documents with new profile`);
      }

      await this.ingestionState.save();
      progress.status = 'completed';
      this.logger.info('Ingestion completed', {
        processed: progress.processedFiles,
        skipped: progress.skippedFiles,
        failed: progress.failedFiles,
        cleaned: progress.cleanedFiles,
      });
    } catch (err) {
      progress.status = 'failed';
      progress.errors.push(err instanceof Error ? err.message : String(err));
      this.logger.error('Ingestion failed', { error: err });
    }

    return progress;
  }

  getJobStatus(jobId: string): IngestionProgress | undefined {
    return this.activeJobs.get(jobId);
  }

  async retag(): Promise<{ retaggedFiles: number; retaggedChunks: number; profile: import('./structure-analyzer.service').FolderStructureProfile }> {
    // 1. Discover files & analyze structure (no parsing, no embedding)
    const files = await this.fileDiscovery.discoverFiles();
    const basePath = this.documentStore.getBasePath();
    const profile = this.structureAnalyzer.analyze(files, basePath);
    await this.ingestionState.saveProfile(profile);
    this.logger.info(`Retag: structure profile = ${profile.pattern}`);

    // 2. For each file in ChromaDB, recalculate metadata and update in-place
    const chromaPaths = await this.vectorStore.getAllDocumentPaths();
    let retaggedFiles = 0;
    let retaggedChunks = 0;

    for (const docPath of chromaPaths) {
      const meta = this.metadataExtractor.extract(docPath, basePath, profile);
      const updated = await this.vectorStore.updateDocumentMetadata(docPath, {
        year: meta.year || '',
        category: meta.category || '',
      });
      if (updated > 0) {
        retaggedFiles++;
        retaggedChunks += updated;
      }
    }

    this.logger.info(`Retag completed: ${retaggedFiles} files, ${retaggedChunks} chunks updated`);
    return { retaggedFiles, retaggedChunks, profile };
  }

  async deleteDocument(documentPath: string): Promise<{ deleted: boolean; path: string }> {
    await this.ingestionState.load();
    await this.vectorStore.deleteDocument(documentPath);
    this.ingestionState.removePath(documentPath);
    await this.ingestionState.save();
    this.logger.info(`Manually deleted document: ${documentPath}`);
    return { deleted: true, path: documentPath };
  }
}
