export interface AgentContext {
  sessionId: string;
  messages: import('./chat.types').ChatMessage[];
  toolCallCount: number;
  handoffCount: number;
  tokenCount: number;
}

export interface HandoffSummary {
  originalQuestion: string;
  searchesPerformed: string[];
  documentsExamined: string[];
  findings: string[];
  remainingQuestions: string[];
}

export interface AgentConfig {
  maxToolCalls: number;
  contextThresholdPercent: number;
  maxHandoffs: number;
  model: string;
}
