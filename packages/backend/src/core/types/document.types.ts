export interface DocumentMetadata {
  filename: string;
  path: string;
  year?: string;
  category?: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'doc' | 'xls' | 'xlsx';
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
  ocrApplied?: boolean;
  ocrConfidence?: number;
  ocrPageCount?: number;
}

export type SupportedFileType = 'pdf' | 'docx' | 'txt' | 'doc' | 'xls' | 'xlsx';
