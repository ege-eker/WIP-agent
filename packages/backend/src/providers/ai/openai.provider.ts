import OpenAI from 'openai';
import { IAIProvider, AIStreamEvent, AIProviderOptions } from '../../core/interfaces/ai-provider.interface';
import { ChatMessage, ToolCallInfo } from '../../core/types/chat.types';
import { AIProviderError } from '../../core/errors/ai.errors';

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: ChatMessage[], options: AIProviderOptions): Promise<AsyncIterable<AIStreamEvent>> {
    const openaiMessages = this.toOpenAIMessages(messages);
    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: openaiMessages as any,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens,
      tools: options.tools as any,
      tool_choice: options.toolChoice as any,
      stream: true,
    });

    return this.processStream(stream);
  }

  async chatNonStreaming(messages: ChatMessage[], options: AIProviderOptions): Promise<{ content: string | null; toolCalls?: ToolCallInfo[]; finishReason: string }> {
    const openaiMessages = this.toOpenAIMessages(messages);
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: openaiMessages as any,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens,
        tools: options.tools as any,
        tool_choice: options.toolChoice as any,
      });

      const choice = response.choices[0];
      const toolCalls = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

      return {
        content: choice.message.content,
        toolCalls,
        finishReason: choice.finish_reason || 'stop',
      };
    } catch (err) {
      throw new AIProviderError(err instanceof Error ? err.message : 'Chat completion failed');
    }
  }

  private async *processStream(stream: AsyncIterable<any>): AsyncIterable<AIStreamEvent> {
    const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      const finishReason = chunk.choices?.[0]?.finish_reason;

      if (delta?.content) {
        yield { type: 'text_delta', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls.has(tc.index)) {
            toolCalls.set(tc.index, { id: '', name: '', arguments: '' });
          }
          const existing = toolCalls.get(tc.index)!;
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name = tc.function.name;
          if (tc.function?.arguments) existing.arguments += tc.function.arguments;
        }
      }

      if (finishReason === 'tool_calls') {
        for (const tc of toolCalls.values()) {
          yield {
            type: 'tool_call_complete',
            toolCall: { id: tc.id, name: tc.name, arguments: tc.arguments },
            finishReason: 'tool_calls',
          };
        }
      }

      if (finishReason === 'stop') {
        yield { type: 'done', finishReason: 'stop' };
      }

      if (finishReason === 'length') {
        yield { type: 'done', finishReason: 'length' };
      }
    }
  }

  private toOpenAIMessages(messages: ChatMessage[]) {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content || '',
          tool_call_id: msg.toolCallId || '',
        };
      }
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: msg.content,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      }
      return { role: msg.role, content: msg.content || '' };
    });
  }
}
