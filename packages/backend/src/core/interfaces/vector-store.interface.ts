import { DocumentChunk } from '../types/document.types';
import { SearchResult, SearchOptions } from '../types/search.types';

export interface IVectorStore {
  initialize(): Promise<void>;
  addDocuments(chunks: DocumentChunk[], embeddings: number[][]): Promise<void>;
  search(embedding: number[], options: SearchOptions): Promise<SearchResult[]>;
  getDocumentChunk(documentPath: string, chunkIndex: number): Promise<DocumentChunk | null>;
  getDocumentMetadata(documentPath: string): Promise<import('../types/document.types').DocumentMetadata | null>;
  listCategories(groupBy: 'category' | 'year' | 'both'): Promise<import('../types/search.types').CategoryGroup[]>;
  filterDocuments(filter: import('../types/tool.types').FilterDocumentsInput): Promise<import('../types/search.types').FilteredDocument[]>;
  getStats(): Promise<{ totalDocuments: number; totalChunks: number }>;
  hasDocument(documentPath: string): Promise<boolean>;
  deleteDocument(documentPath: string): Promise<void>;
  getAllDocumentPaths(): Promise<string[]>;
  updateDocumentMetadata(documentPath: string, metadata: { year?: string; category?: string }): Promise<number>;
}
