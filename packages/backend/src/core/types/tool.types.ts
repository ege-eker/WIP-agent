export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
}

export interface SearchDocumentsInput {
  query: string;
  top_k?: number;
  year?: string;
  category?: string;
}

export interface ListCategoriesInput {
  group_by: 'category' | 'year' | 'both';
}

export interface FilterDocumentsInput {
  year?: string;
  category?: string;
  file_type?: string;
  filename_contains?: string;
  limit?: number;
}

export interface ReadDocumentChunkInput {
  document_path: string;
  chunk_index: number;
  read_adjacent?: 'next' | 'previous';
}

export interface GetDocumentInfoInput {
  document_path: string;
}

export interface BrowseDirectoryInput {
  path?: string;
}

export interface ReadFileContentInput {
  file_path: string;
}

export interface GetFileInfoInput {
  file_path: string;
}

export interface BrowseTreeInput {
  path?: string;
  max_depth?: number;
}
