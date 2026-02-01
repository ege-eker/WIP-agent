export interface SearchResult {
  documentPath: string;
  filename: string;
  chunkIndex: number;
  score: number;
  preview: string;
  metadata: {
    year?: string;
    category?: string;
    fileType: string;
  };
}

export interface SearchOptions {
  topK: number;
  where?: Record<string, string>;
}

export interface CategoryGroup {
  name: string;
  documentCount: number;
}

export interface FilteredDocument {
  filename: string;
  path: string;
  fileType: string;
  sizeBytes: number;
  year?: string;
  category?: string;
}
