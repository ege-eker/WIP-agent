export type SSEEventType = 'text_delta' | 'tool_call_start' | 'tool_call_progress' | 'tool_call_result' | 'handoff' | 'done' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

export interface ToolCallDisplay {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: 'running' | 'completed' | 'error';
  progressMessage?: string;
  progressDetails?: Record<string, any>;
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCallDisplay[];
  isStreaming: boolean;
}
