import { IVectorStore } from '../core/interfaces/vector-store.interface';
import { IEmbeddingProvider } from '../core/interfaces/embedding-provider.interface';
import { IDocumentStore } from '../core/interfaces/document-store.interface';
import { ILogger } from '../core/interfaces/logger.interface';
import { ToolCallInfo } from '../core/types/chat.types';
import { ToolResult } from '../core/types/tool.types';
import { searchDocuments } from './tools/search-documents.tool';
import { listCategories } from './tools/list-categories.tool';
import { filterDocuments } from './tools/filter-documents.tool';
import { readDocumentChunk } from './tools/read-document-chunk.tool';
import { getDocumentInfo } from './tools/get-document-info.tool';
import { browseDirectory } from './tools/browse-directory.tool';
import { readFileContent } from './tools/read-file-content.tool';
import { getFileInfo } from './tools/get-file-info.tool';

export class ToolExecutorService {
  constructor(
    private vectorStore: IVectorStore,
    private embeddingProvider: IEmbeddingProvider,
    private documentStore: IDocumentStore,
    private logger: ILogger
  ) {}

  async execute(toolCall: ToolCallInfo): Promise<ToolResult> {
    this.logger.debug(`Executing tool: ${toolCall.name}`, { arguments: toolCall.arguments });

    let result: string;
    try {
      const args = JSON.parse(toolCall.arguments);

      switch (toolCall.name) {
        case 'search_documents':
          result = await searchDocuments(args, this.vectorStore, this.embeddingProvider);
          break;
        case 'list_categories':
          result = await listCategories(args, this.vectorStore);
          break;
        case 'filter_documents':
          result = await filterDocuments(args, this.vectorStore);
          break;
        case 'read_document_chunk':
          result = await readDocumentChunk(args, this.vectorStore);
          break;
        case 'get_document_info':
          result = await getDocumentInfo(args, this.vectorStore);
          break;
        case 'browse_directory':
          result = await browseDirectory(args, this.documentStore);
          break;
        case 'read_file_content':
          result = await readFileContent(args, this.documentStore);
          break;
        case 'get_file_info':
          result = await getFileInfo(args, this.documentStore);
          break;
        default:
          result = JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Tool execution failed: ${toolCall.name}`, { error: message });
      result = JSON.stringify({ error: `Tool execution failed: ${message}` });
    }

    this.logger.debug(`Tool result for ${toolCall.name}`, { resultLength: result.length });

    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      result,
    };
  }
}
