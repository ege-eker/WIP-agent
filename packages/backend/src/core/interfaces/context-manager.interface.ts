import { ChatMessage } from '../types/chat.types';
import { HandoffSummary } from '../types/agent.types';

export interface IContextManager {
  countTokens(messages: ChatMessage[]): number;
  isNearLimit(messages: ChatMessage[], thresholdPercent: number): boolean;
  createHandoffSummary(messages: ChatMessage[]): Promise<HandoffSummary>;
  buildHandoffMessages(summary: HandoffSummary, originalQuestion: string): ChatMessage[];
}
