import { SSEEvent } from '../types/chat.types';

export interface IAgent {
  run(sessionId: string, userMessage: string): AsyncIterable<SSEEvent>;
}
