export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCalls?: ToolCallInfo[];
  toolCallId?: string;
  name?: string;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
}

export interface DocumentStats {
  totalDocuments: number;
  totalChunks: number;
}

export interface IngestionResult {
  jobId: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  errors: string[];
}
