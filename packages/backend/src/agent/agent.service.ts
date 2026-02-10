import { IAgent } from '../core/interfaces/agent.interface';
import { IAIProvider } from '../core/interfaces/ai-provider.interface';
import { ILogger } from '../core/interfaces/logger.interface';
import { ChatMessage, SSEEvent } from '../core/types/chat.types';
import { AgentConfig } from '../core/types/agent.types';
import { ContextManagerService } from './context-manager.service';
import { ToolExecutorService } from './tool-executor.service';
import { TOOL_DEFINITIONS } from './tool-definitions';
import { ContextOverflowError, MaxToolCallsError } from '../core/errors/ai.errors';
import { ProgressChannel } from '../utils/progress-channel';

const SYSTEM_PROMPT = `You are an intelligent document search assistant. You have access to a collection of documents (PDF, DOCX, TXT files) that you can search through using the provided tools.

You have two categories of tools:

**Filesystem Tools** (browse the actual folder structure):
- browse_directory: List files and subdirectories at a given path. Use for structural queries like "what folders exist?" or "show me the Engineering/2023 folder".
- read_file_content: Read the raw content of a file directly from disk.
- get_file_info: Get file metadata (size, modification date).

**RAG Tools** (search via vector database):
- search_documents: Semantic vector search across all documents.
- list_categories: Show document collection structure by category/year.
- filter_documents: Filter documents by metadata (year, category, type).
- read_document_chunk: Read a specific chunk of a document from the vector store.
- get_document_info: Get detailed metadata about a document from the vector store.

**Strategy:**
- For structural queries (e.g. "what's in the Engineering folder?", "show me 2023 documents", "list all folders"): Start with browse_directory, then drill down as needed.
- For content queries (e.g. "what does the API guidelines document say about authentication?"): Start with search_documents, then read content for details.
- If one approach doesn't yield results, fall back to the other. For example, if browse_directory shows the folder structure but you need content, use search_documents or read_file_content next.

Always cite the document name and path when providing information. Be thorough - if the first search doesn't yield good results, try different queries or filters. When you find relevant documents, read their content to provide accurate answers.

If you cannot find relevant information after thorough searching, say so clearly.`;

export class AgentService implements IAgent {
  constructor(
    private aiProvider: IAIProvider,
    private contextManager: ContextManagerService,
    private toolExecutor: ToolExecutorService,
    private config: AgentConfig,
    private logger: ILogger
  ) {}

  async *run(sessionId: string, userMessage: string, existingMessages: ChatMessage[] = []): AsyncGenerator<SSEEvent> {
    let messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...existingMessages,
      { role: 'user', content: userMessage },
    ];

    let toolCallCount = 0;
    let handoffCount = 0;

    this.logger.info('Agent run started', { sessionId, handoffCount });

    while (true) {
      // Check context before sending to AI
      if (this.contextManager.isNearLimit(messages, this.config.contextThresholdPercent)) {
        if (handoffCount >= this.config.maxHandoffs) {
          throw new ContextOverflowError();
        }

        this.logger.info('Context near limit, performing handoff', { handoffCount });
        yield { type: 'handoff', data: { handoffNumber: handoffCount + 1 } };

        const summary = await this.contextManager.createHandoffSummary(messages);
        const handoffMessages = this.contextManager.buildHandoffMessages(summary, userMessage);

        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...handoffMessages,
        ];
        handoffCount++;
        continue;
      }

      // Check tool call limit
      if (toolCallCount >= this.config.maxToolCalls) {
        this.logger.warn('Max tool calls reached, forcing final answer');
        // Force a final answer with no tools
        const stream = await this.aiProvider.chat(messages, {
          model: this.config.model,
          tools: TOOL_DEFINITIONS as any,
          toolChoice: 'none',
        });

        for await (const event of stream) {
          if (event.type === 'text_delta' && event.content) {
            yield { type: 'text_delta', data: event.content };
          }
        }

        yield { type: 'done', data: null };
        return;
      }

      // Send to AI with tools
      const stream = await this.aiProvider.chat(messages, {
        model: this.config.model,
        tools: TOOL_DEFINITIONS as any,
        toolChoice: 'auto',
      });

      let assistantContent = '';
      const pendingToolCalls: Array<{ id: string; name: string; arguments: string }> = [];
      let finishReason: string | undefined;

      for await (const event of stream) {
        if (event.type === 'text_delta' && event.content) {
          assistantContent += event.content;
          yield { type: 'text_delta', data: event.content };
        }

        if (event.type === 'tool_call_complete' && event.toolCall) {
          pendingToolCalls.push(event.toolCall);
          yield { type: 'tool_call_start', data: { id: event.toolCall.id, name: event.toolCall.name, arguments: event.toolCall.arguments } };
        }

        if (event.type === 'done') {
          finishReason = event.finishReason;
        }
      }

      // If AI returned text only (stop), we're done
      if (finishReason === 'stop' || (pendingToolCalls.length === 0 && assistantContent)) {
        // Add assistant message to history
        messages.push({ role: 'assistant', content: assistantContent || null });
        yield { type: 'done', data: null };
        return;
      }

      // Handle tool calls
      if (pendingToolCalls.length > 0) {
        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: assistantContent || null,
          toolCalls: pendingToolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
          })),
        });

        // Execute each tool call
        for (const tc of pendingToolCalls) {
          toolCallCount++;

          const progressChannel = new ProgressChannel();

          // Start tool execution (don't await yet)
          const executionPromise = this.toolExecutor.execute(
            {
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            },
            (message, details) => {
              progressChannel.push({ message, details });
            }
          ).finally(() => {
            progressChannel.close();
          });

          // Consume progress events while tool is executing
          let progressEvent = await progressChannel.next();
          while (progressEvent !== null) {
            yield {
              type: 'tool_call_progress',
              data: { id: tc.id, name: tc.name, message: progressEvent.message, details: progressEvent.details },
            };
            progressEvent = await progressChannel.next();
          }

          // Wait for tool to complete and get result
          const result = await executionPromise;

          yield {
            type: 'tool_call_result',
            data: { id: tc.id, name: tc.name, result: result.result },
          };

          messages.push({
            role: 'tool',
            content: result.result,
            toolCallId: tc.id,
            name: tc.name,
          });
        }

        // Continue the loop to send results back to AI
        continue;
      }

      // Fallback - shouldn't normally reach here
      yield { type: 'done', data: null };
      return;
    }
  }
}
