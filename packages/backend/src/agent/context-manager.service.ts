import { IContextManager } from '../core/interfaces/context-manager.interface';
import { IAIProvider } from '../core/interfaces/ai-provider.interface';
import { ChatMessage } from '../core/types/chat.types';
import { HandoffSummary } from '../core/types/agent.types';
import { countMessageTokens, MAX_CONTEXT_TOKENS } from '../utils/token-counter';

const HANDOFF_SYSTEM_PROMPT = `You are a summarization assistant. Analyze the conversation so far and create a structured summary for a handoff to a fresh agent context.

Output a JSON object with these fields:
- originalQuestion: the user's original question
- searchesPerformed: array of searches/tool calls made
- documentsExamined: array of document paths examined
- findings: array of key findings so far
- remainingQuestions: array of what still needs to be investigated

Be thorough but concise. This summary will be used to continue the investigation in a fresh context window.`;

export class ContextManagerService implements IContextManager {
  constructor(private aiProvider: IAIProvider, private model: string) {}

  countTokens(messages: ChatMessage[]): number {
    return countMessageTokens(messages);
  }

  isNearLimit(messages: ChatMessage[], thresholdPercent: number): boolean {
    const tokens = this.countTokens(messages);
    const threshold = (thresholdPercent / 100) * MAX_CONTEXT_TOKENS;
    return tokens >= threshold;
  }

  async createHandoffSummary(messages: ChatMessage[]): Promise<HandoffSummary> {
    const summaryMessages: ChatMessage[] = [
      { role: 'system', content: HANDOFF_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the conversation to summarize:\n\n${messages
          .map((m) => `[${m.role}]: ${m.content || '(tool call)'}`)
          .join('\n\n')}`,
      },
    ];

    const response = await this.aiProvider.chatNonStreaming(summaryMessages, {
      model: this.model,
      temperature: 0,
      maxTokens: 2000,
    });

    try {
      const parsed = JSON.parse(response.content || '{}');
      return {
        originalQuestion: parsed.originalQuestion || '',
        searchesPerformed: parsed.searchesPerformed || [],
        documentsExamined: parsed.documentsExamined || [],
        findings: parsed.findings || [],
        remainingQuestions: parsed.remainingQuestions || [],
      };
    } catch {
      return {
        originalQuestion: '',
        searchesPerformed: [],
        documentsExamined: [],
        findings: [response.content || 'Summary generation failed'],
        remainingQuestions: [],
      };
    }
  }

  buildHandoffMessages(summary: HandoffSummary, originalQuestion: string): ChatMessage[] {
    const summaryText = [
      `## Previous Investigation Summary`,
      `**Original Question:** ${summary.originalQuestion || originalQuestion}`,
      `**Searches Performed:** ${summary.searchesPerformed.join(', ') || 'None'}`,
      `**Documents Examined:** ${summary.documentsExamined.join(', ') || 'None'}`,
      `**Findings So Far:**\n${summary.findings.map((f) => `- ${f}`).join('\n')}`,
      `**Remaining Questions:**\n${summary.remainingQuestions.map((q) => `- ${q}`).join('\n')}`,
    ].join('\n\n');

    return [
      {
        role: 'user' as const,
        content: `${summaryText}\n\nPlease continue investigating the original question: "${originalQuestion}". Use the available tools to find any remaining information.`,
      },
    ];
  }
}
