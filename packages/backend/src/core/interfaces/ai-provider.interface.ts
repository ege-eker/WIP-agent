import { ChatMessage, ToolCallInfo } from '../types/chat.types';
import { ToolDefinition } from '../types/tool.types';

export interface AIStreamEvent {
  type: 'text_delta' | 'tool_call_delta' | 'tool_call_complete' | 'done';
  content?: string;
  toolCall?: ToolCallInfo;
  finishReason?: 'stop' | 'tool_calls' | 'length';
}

export interface AIProviderOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
}

export interface IAIProvider {
  chat(messages: ChatMessage[], options: AIProviderOptions): Promise<AsyncIterable<AIStreamEvent>>;
  chatNonStreaming(messages: ChatMessage[], options: AIProviderOptions): Promise<{ content: string | null; toolCalls?: ToolCallInfo[]; finishReason: string }>;
}
