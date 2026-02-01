import { ToolDefinition } from '../core/types/tool.types';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'Perform semantic vector search across the document collection. Returns documents ranked by similarity to the query.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query text',
          },
          top_k: {
            type: 'number',
            description: 'Number of results to return (default: 5, max: 20)',
          },
          year: {
            type: 'string',
            description: 'Filter by year (e.g. "2023")',
          },
          category: {
            type: 'string',
            description: 'Filter by category',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: 'List the structure of the document collection, showing categories, years, and document counts.',
      parameters: {
        type: 'object',
        properties: {
          group_by: {
            type: 'string',
            enum: ['category', 'year', 'both'],
            description: 'How to group the results',
          },
        },
        required: ['group_by'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_documents',
      description: 'Filter documents by metadata attributes. Returns a list of matching documents.',
      parameters: {
        type: 'object',
        properties: {
          year: {
            type: 'string',
            description: 'Filter by year',
          },
          category: {
            type: 'string',
            description: 'Filter by category',
          },
          file_type: {
            type: 'string',
            enum: ['pdf', 'docx', 'txt'],
            description: 'Filter by file type',
          },
          filename_contains: {
            type: 'string',
            description: 'Filter by filename substring',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_document_chunk',
      description: 'Read the full content of a specific chunk from a document. Use this to examine document content in detail.',
      parameters: {
        type: 'object',
        properties: {
          document_path: {
            type: 'string',
            description: 'Full path of the document',
          },
          chunk_index: {
            type: 'number',
            description: 'Index of the chunk to read (0-based)',
          },
          read_adjacent: {
            type: 'string',
            enum: ['next', 'previous'],
            description: 'Optionally read the next or previous chunk instead',
          },
        },
        required: ['document_path', 'chunk_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_document_info',
      description: 'Get detailed metadata about a specific document including filename, path, year, category, type, size, chunk count, and preview.',
      parameters: {
        type: 'object',
        properties: {
          document_path: {
            type: 'string',
            description: 'Full path of the document',
          },
        },
        required: ['document_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browse_directory',
      description: 'Browse the document folder structure. Lists files and subdirectories at a given path. Use this for structural queries like "what folders exist?" or "show me Engineering/2023 contents".',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path within the documents folder (e.g. "", "Engineering", "HR/2024"). Empty or omitted for root.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file_content',
      description: 'Read the full content of a file directly from disk. Use this when you know the exact file path and want to read its raw content (not chunked via vector store).',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Relative path to the file within the documents folder (e.g. "Engineering/2023/api-guidelines.pdf")',
          },
        },
        required: ['file_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_file_info',
      description: 'Get filesystem metadata (size, modification date) for a specific file. Use this to check file details without reading the content.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Relative path to the file within the documents folder',
          },
        },
        required: ['file_path'],
      },
    },
  },
];
