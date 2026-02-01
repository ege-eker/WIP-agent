export interface DocumentMetadata {
  filename: string;
  path: string;
  year?: string;
  category?: string;
  fileType: 'pdf' | 'docx' | 'txt';
  sizeBytes: number;
  chunkCount: number;
  indexedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentPath: string;
  chunkIndex: number;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentInfo {
  filename: string;
  path: string;
  year?: string;
  category?: string;
  fileType: string;
  sizeBytes: number;
  chunkCount: number;
  preview: string;
}

export interface ParsedDocument {
  content: string;
  metadata: Partial<DocumentMetadata>;
}

export type SupportedFileType = 'pdf' | 'docx' | 'txt';
