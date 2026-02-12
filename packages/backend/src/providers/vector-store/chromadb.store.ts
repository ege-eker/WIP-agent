import { ChromaClient, Collection } from 'chromadb';
import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { DocumentChunk, DocumentMetadata } from '../../core/types/document.types';
import { SearchResult, SearchOptions, CategoryGroup, FilteredDocument } from '../../core/types/search.types';
import { FilterDocumentsInput } from '../../core/types/tool.types';
import { ILogger } from '../../core/interfaces/logger.interface';

export class ChromaDBStore implements IVectorStore {
  private client: ChromaClient;
  private collection!: Collection;
  private collectionName: string;

  constructor(
    private chromaUrl: string,
    collectionName: string,
    private logger: ILogger
  ) {
    this.client = new ChromaClient({ path: chromaUrl });
    this.collectionName = collectionName;
  }

  async initialize(): Promise<void> {
    this.collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
      metadata: { 'hnsw:space': 'cosine' },
    });
    this.logger.info('ChromaDB collection initialized', { name: this.collectionName });
  }

  async addDocuments(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchEmbeddings = embeddings.slice(i, i + batchSize);

      await this.collection.add({
        ids: batch.map((c) => c.id),
        embeddings: batchEmbeddings,
        documents: batch.map((c) => c.content),
        metadatas: batch.map((c) => ({
          documentPath: c.documentPath,
          chunkIndex: c.chunkIndex,
          filename: c.metadata.filename,
          year: c.metadata.year || '',
          category: c.metadata.category || '',
          fileType: c.metadata.fileType,
          sizeBytes: c.metadata.sizeBytes,
          chunkCount: c.metadata.chunkCount,
        })),
      });
    }
    this.logger.info(`Added ${chunks.length} chunks to ChromaDB`);
  }

  async search(embedding: number[], options: SearchOptions): Promise<SearchResult[]> {
    const whereConditions: Record<string, any>[] = [];
    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        if (value) whereConditions.push({ [key]: { $eq: value } });
      }
    }

    let where: any = undefined;
    if (whereConditions.length === 1) {
      where = whereConditions[0];
    } else if (whereConditions.length > 1) {
      where = { $and: whereConditions };
    }

    const results = await this.collection.query({
      queryEmbeddings: [embedding],
      nResults: options.topK,
      where,
    });

    if (!results.ids[0]) return [];

    return results.ids[0].map((id, idx) => ({
      documentPath: (results.metadatas?.[0]?.[idx] as any)?.documentPath || '',
      filename: (results.metadatas?.[0]?.[idx] as any)?.filename || '',
      chunkIndex: (results.metadatas?.[0]?.[idx] as any)?.chunkIndex || 0,
      score: results.distances?.[0]?.[idx] ? 1 - (results.distances[0][idx] || 0) : 0,
      preview: (results.documents?.[0]?.[idx] || '').slice(0, 200),
      metadata: {
        year: (results.metadatas?.[0]?.[idx] as any)?.year,
        category: (results.metadatas?.[0]?.[idx] as any)?.category,
        fileType: (results.metadatas?.[0]?.[idx] as any)?.fileType || '',
      },
    }));
  }

  async getDocumentChunk(documentPath: string, chunkIndex: number): Promise<DocumentChunk | null> {
    // Try both NFC and NFD normalizations to handle Turkish characters
    const pathsToTry = [documentPath, documentPath.normalize('NFC'), documentPath.normalize('NFD')];
    const uniquePaths = [...new Set(pathsToTry)];

    for (const path of uniquePaths) {
      const results = await this.collection.get({
        where: {
          $and: [
            { documentPath: { $eq: path } },
            { chunkIndex: { $eq: chunkIndex } },
          ],
        } as any,
        limit: 1,
      });

      if (results.ids.length) {
        const meta = results.metadatas?.[0] as any;
        return {
          id: results.ids[0],
          documentPath: path,
          chunkIndex,
          content: results.documents?.[0] || '',
          metadata: {
            filename: meta?.filename || '',
            path: path,
            year: meta?.year,
            category: meta?.category,
            fileType: meta?.fileType || 'txt',
            sizeBytes: meta?.sizeBytes || 0,
            chunkCount: meta?.chunkCount || 0,
            indexedAt: '',
          },
        };
      }
    }

    return null;
  }

  async getDocumentMetadata(documentPath: string): Promise<DocumentMetadata | null> {
    // Try both NFC and NFD normalizations to handle Turkish characters
    const pathsToTry = [documentPath, documentPath.normalize('NFC'), documentPath.normalize('NFD')];
    const uniquePaths = [...new Set(pathsToTry)];

    for (const path of uniquePaths) {
      const results = await this.collection.get({
        where: { documentPath: { $eq: path } } as any,
        limit: 1,
      });

      if (results.ids.length) {
        const meta = results.metadatas?.[0] as any;
        const allChunks = await this.collection.get({
          where: { documentPath: { $eq: path } } as any,
        });

        return {
          filename: meta?.filename || '',
          path: path,
          year: meta?.year,
          category: meta?.category,
          fileType: meta?.fileType || 'txt',
          sizeBytes: meta?.sizeBytes || 0,
          chunkCount: allChunks.ids.length,
          indexedAt: '',
        };
      }
    }

    return null;
  }

  async listCategories(groupBy: 'category' | 'year' | 'both'): Promise<CategoryGroup[]> {
    const allDocs = await this.collection.get();
    const groups = new Map<string, Set<string>>();

    for (const meta of (allDocs.metadatas || [])) {
      const m = meta as any;
      const keys: string[] = [];
      if ((groupBy === 'category' || groupBy === 'both') && m?.category) {
        keys.push(`category:${m.category}`);
      }
      if ((groupBy === 'year' || groupBy === 'both') && m?.year) {
        keys.push(`year:${m.year}`);
      }
      for (const key of keys) {
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key)!.add(m?.documentPath || '');
      }
    }

    return Array.from(groups.entries()).map(([name, docs]) => ({
      name,
      documentCount: docs.size,
    }));
  }

  async filterDocuments(filter: FilterDocumentsInput): Promise<FilteredDocument[]> {
    const whereConditions: Record<string, any>[] = [];
    if (filter.year) whereConditions.push({ year: { $eq: filter.year } });
    if (filter.category) whereConditions.push({ category: { $eq: filter.category } });
    if (filter.file_type) whereConditions.push({ fileType: { $eq: filter.file_type } });

    let where: any = undefined;
    if (whereConditions.length === 1) {
      where = whereConditions[0];
    } else if (whereConditions.length > 1) {
      where = { $and: whereConditions };
    }

    const results = await this.collection.get({ where });
    const docMap = new Map<string, FilteredDocument>();

    for (const meta of (results.metadatas || [])) {
      const m = meta as any;
      const docPath = m?.documentPath;
      if (!docPath) continue;

      if (filter.filename_contains && !(m?.filename || '').toLowerCase().includes(filter.filename_contains.toLowerCase())) {
        continue;
      }

      if (!docMap.has(docPath)) {
        docMap.set(docPath, {
          filename: m?.filename || '',
          path: docPath,
          fileType: m?.fileType || '',
          sizeBytes: m?.sizeBytes || 0,
          year: m?.year,
          category: m?.category,
        });
      }
    }

    const docs = Array.from(docMap.values());
    return filter.limit ? docs.slice(0, filter.limit) : docs;
  }

  async getStats(): Promise<{ totalDocuments: number; totalChunks: number }> {
    const count = await this.collection.count();
    const allDocs = await this.collection.get();
    const uniquePaths = new Set((allDocs.metadatas || []).map((m: any) => m?.documentPath));

    return {
      totalDocuments: uniquePaths.size,
      totalChunks: count,
    };
  }

  async hasDocument(documentPath: string): Promise<boolean> {
    const results = await this.collection.get({
      where: { documentPath: { $eq: documentPath } } as any,
      limit: 1,
    });
    return results.ids.length > 0;
  }

  async deleteDocument(documentPath: string): Promise<void> {
    const results = await this.collection.get({
      where: { documentPath: { $eq: documentPath } } as any,
    });
    if (results.ids.length > 0) {
      await this.collection.delete({ ids: results.ids });
    }
  }

  async getAllDocumentPaths(): Promise<string[]> {
    const allDocs = await this.collection.get();
    const paths = new Set<string>();
    for (const meta of allDocs.metadatas || []) {
      const docPath = (meta as any)?.documentPath;
      if (docPath) paths.add(docPath);
    }
    return Array.from(paths);
  }

  async updateDocumentMetadata(
    documentPath: string,
    metadata: { year?: string; category?: string }
  ): Promise<number> {
    const results = await this.collection.get({
      where: { documentPath: { $eq: documentPath } } as any,
    });
    if (results.ids.length === 0) return 0;

    const updatedMetadatas = results.metadatas.map((m: any) => ({
      ...m,
      ...(metadata.year !== undefined && { year: metadata.year }),
      ...(metadata.category !== undefined && { category: metadata.category }),
    }));

    await this.collection.update({
      ids: results.ids,
      metadatas: updatedMetadatas,
    });

    return results.ids.length;
  }
}
