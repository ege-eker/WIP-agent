import { ToolDefinition } from '../core/types/tool.types';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'Perform semantic vector search across the document collection. Returns documents ranked by similarity score (0-1). Each result includes the matching chunkIndex — use this index when calling read_document_chunk. Scores above 0.5 are strong matches. Scores 0.3-0.5 are moderate — always follow up by reading the matched chunk content with read_document_chunk using the returned chunkIndex. Below 0.3 — rephrase and search again. This is the best tool for finding document content by topic or meaning. Prefer this over browsing when the user asks about document contents.',
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
      description: 'Read the full content of a specific chunk from a document. Use the chunkIndex from search_documents results to read the matched chunk. Use read_adjacent parameter to navigate to neighboring chunks if the content seems incomplete or you need more context.',
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
      name: 'browse_tree',
      description: 'Get a recursive tree view of the folder structure. Use this to understand the full layout quickly.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path (default: root)',
          },
          max_depth: {
            type: 'number',
            description: 'Max depth to traverse (default: 3, max: 5)',
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
