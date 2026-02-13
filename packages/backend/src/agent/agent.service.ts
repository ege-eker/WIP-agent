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
import { IngestionStateService } from '../ingestion/ingestion-state.service';
import { FolderStructureProfile } from '../ingestion/structure-analyzer.service';

function buildSystemPrompt(profile?: FolderStructureProfile | null): string {
  const base = `You are an intelligent document search assistant. You have access to a collection of documents (PDF, DOCX, TXT files) that you can search through using the provided tools. You always answer questions in Turkish language.

You have two categories of tools:

**Filesystem Tools** (browse the actual folder structure):
- browse_directory: List files and subdirectories at a given path. Use for structural queries like "what folders exist?" or "show me the Engineering/2023 folder".
- browse_tree: Get a recursive tree view of the folder structure. Use this first to understand the full layout quickly.
- read_file_content: Read the raw content of a file directly from disk.
- get_file_info: Get file metadata (size, modification date).

**RAG Tools** (search via vector database):
- search_documents: Semantic vector search across all documents.
- list_categories: Show document collection structure by category/year.
- filter_documents: Filter documents by metadata (year, category, type).
- read_document_chunk: Read a specific chunk of a document from the vector store.
- get_document_info: Get detailed metadata about a document from the vector store.

**Strategy — choose your starting approach based on the query type:**

1. **Structural queries** (e.g. "what folders exist?", "list files in Engineering/2023"):
   → Start with browse_tree or browse_directory.

2. **Content/semantic queries** (e.g. "what does the API doc say about auth?", "find documents about budget"):
   → Start with search_documents. This performs semantic vector search — the fastest way to find content by meaning.
   → Only fall back to filesystem browsing if search_documents returns no results or very low scores.

3. **Metadata queries** (e.g. "how many PDF files from 2023?", "list all HR documents"):
   → Start with filter_documents or list_categories.
   → If no metadata matches, fall back to search_documents with a semantic query.

**Interpreting search_documents scores:**
- Above 0.5: Strong match — read the content to answer the query.
- 0.3–0.5: Moderate — DO NOT answer based on preview alone. You MUST read the top result's content using read_document_chunk with the chunkIndex from the search result (not always 0). If the chunk content seems incomplete, use read_adjacent to check neighboring chunks. Also try at least one alternative search query with different keywords.
- Below 0.3: Weak — rephrase with synonyms or broader/narrower terms and search again before giving up.
- NEVER conclude "not found" after only one search_documents call. Always either read document content or try a rephrased query first.

**Fallback rules:**
- If filesystem browsing shows files but you need their content → use search_documents or read_file_content.
- If filter_documents returns 0 results → try search_documents with a semantic query.
- If search_documents returns weak results → rephrase and retry before giving up.
- After search_documents, if best score is below 0.5, ALWAYS read the top result's content with read_document_chunk using the chunkIndex from the search result before concluding.
- Do NOT call browse_tree more than once per conversation unless the user asks about a different path.
- Do NOT repeatedly browse the same directory path.

When you find relevant documents, ALWAYS start your answer by clearly stating the source file name and full path (e.g. "**Source:** filename.pdf — path/to/filename.pdf"), then continue with the actual content. Never bury the source citation in the middle or end of your response. Be thorough - if the first search doesn't yield good results, try different queries or filters. Read document content to provide accurate answers.

If you cannot find relevant information after thorough searching, say so clearly.`;

  if (profile) {
    return base + `\n\n**Document Collection Info:**\n${profile.summary}\nAvailable categories: ${profile.categories.join(', ') || 'none detected'}\nAvailable years: ${profile.years.join(', ') || 'none detected'}`;
  }
  return base;
}

const CONTENT_KEYWORDS = [
  // English
  'what does', 'says about', 'mention', 'content', 'explain',
  'summarize', 'find information', 'about', 'regarding', 'how to',
  'details', 'according to', 'discusses', 'contains',
  // Turkish
  'ne yazıyor', 'ne diyor', 'hakkında', 'içeriğ', 'özetle',
  'bahsed', 'anlatıyor', 'bilgi', 'açıkla', 'bulunuyor',
  'içinde', 'konusunda', 'ilgili', 'nedir',
];

function looksLikeContentQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return CONTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

const FS_TOOLS = new Set(['browse_directory', 'browse_tree', 'read_file_content', 'get_file_info']);

function generateToolHint(toolName: string, result: string, userMessage: string): string | null {
  if ((toolName === 'browse_directory' || toolName === 'browse_tree') && looksLikeContentQuery(userMessage)) {
    return 'Consider using search_documents for content-based queries.';
  }

  if (toolName === 'filter_documents') {
    try {
      const parsed = JSON.parse(result);
      if (parsed.documents && parsed.documents.length === 0) {
        return 'No metadata matches. Try search_documents with a semantic query.';
      }
    } catch { /* not JSON, skip */ }
  }

  if (toolName === 'search_documents') {
    try {
      const parsed = JSON.parse(result);
      if (parsed.results && parsed.results.length > 0) {
        const bestScore = Math.max(...parsed.results.map((r: any) => r.score));
        if (bestScore < 0.3) {
          return 'Very low relevance scores. Rephrase your query with different keywords or synonyms and search again.';
        }
        if (bestScore < 0.5) {
          return 'Moderate relevance scores — results may not directly answer the query. ' +
                 'Read the top result content using read_document_chunk with the chunkIndex from the search result (not 0 unless the result says 0). ' +
                 'If content seems incomplete, use read_adjacent to check neighboring chunks. ' +
                 'Also try at least one more search with rephrased keywords.';
        }
      }
    } catch { /* not JSON, skip */ }
  }

  return null;
}

export class AgentService implements IAgent {
  private ingestionState: IngestionStateService;

  constructor(
    private aiProvider: IAIProvider,
    private contextManager: ContextManagerService,
    private toolExecutor: ToolExecutorService,
    private config: AgentConfig,
    private logger: ILogger,
    documentBasePath: string
  ) {
    this.ingestionState = new IngestionStateService(documentBasePath);
  }

  async *run(sessionId: string, userMessage: string, existingMessages: ChatMessage[] = []): AsyncGenerator<SSEEvent> {
    // Load structure profile for dynamic prompt
    const profile = await this.ingestionState.loadProfile();
    const systemPrompt = buildSystemPrompt(profile);

    let messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...existingMessages,
      { role: 'user', content: userMessage },
    ];

    let toolCallCount = 0;
    let handoffCount = 0;
    let fsToolCount = 0;
    let ragToolCount = 0;
    let ragNudgeInjected = false;

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
          { role: 'system', content: systemPrompt },
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

      // RAG nudge: if many filesystem calls but no semantic search yet, inject a hint
      if (!ragNudgeInjected && fsToolCount >= 3 && ragToolCount === 0 && toolCallCount >= 5) {
        ragNudgeInjected = true;
        messages.push({
          role: 'user',
          content: '[System guidance: You have used several filesystem tools but have not yet tried search_documents. ' +
                   'For content-related queries, semantic search is often more effective. ' +
                   'Please consider using search_documents before continuing with filesystem exploration.]',
        });
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
          if (FS_TOOLS.has(tc.name)) fsToolCount++;
          if (tc.name === 'search_documents') ragToolCount++;

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

          // SSE event → raw result (frontend sees this)
          yield {
            type: 'tool_call_result',
            data: { id: tc.id, name: tc.name, result: result.result },
          };

          // LLM context → hint-augmented result
          const hint = generateToolHint(tc.name, result.result, userMessage);
          const finalResult = hint ? result.result + '\n\n---\n' + hint : result.result;
          messages.push({
            role: 'tool',
            content: finalResult,
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
