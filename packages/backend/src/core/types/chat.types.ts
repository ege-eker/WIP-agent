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

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export type SSEEventType = 'text_delta' | 'tool_call_start' | 'tool_call_result' | 'handoff' | 'done' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}
