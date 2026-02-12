import { Search, FolderOpen, FileText, Info, Filter, CheckCircle, Loader2, Eye } from 'lucide-react';
import { ToolCallDisplay as ToolCallType } from '../../types/chat.types';
import { useState } from 'react';
import { linkifyPaths } from '../../utils/path-linkify';

const TOOL_ICONS: Record<string, typeof Search> = {
  search_documents: Search,
  list_categories: FolderOpen,
  filter_documents: Filter,
  read_document_chunk: FileText,
  get_document_info: Info,
  browse_directory: FolderOpen,
  read_file_content: Eye,
  get_file_info: Info,
};

const TOOL_LABELS: Record<string, string> = {
  search_documents: 'Searching documents',
  list_categories: 'Listing categories',
  filter_documents: 'Filtering documents',
  read_document_chunk: 'Reading document',
  get_document_info: 'Getting document info',
  browse_directory: 'Browsing directory',
  read_file_content: 'Reading file',
  get_file_info: 'Getting file info',
};

function linkifyJsonText(text: string) {
  // Split by lines and linkify each line independently to preserve formatting
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && '\n'}
      {linkifyPaths(line)}
    </span>
  ));
}

export function ToolCallDisplay({ toolCall }: { toolCall: ToolCallType }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[toolCall.name] || Search;
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;
  const isRunning = toolCall.status === 'running';

  let parsedArgs: string;
  try {
    parsedArgs = JSON.stringify(JSON.parse(toolCall.arguments), null, 2);
  } catch {
    parsedArgs = toolCall.arguments;
  }

  let formattedResult: string | undefined;
  if (toolCall.result) {
    try {
      formattedResult = JSON.stringify(JSON.parse(toolCall.result), null, 2);
    } catch {
      formattedResult = toolCall.result;
    }
  }

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors min-w-0"
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
        <Icon className="w-4 h-4" />
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="font-medium truncate">{label}</span>
          {isRunning && toolCall.progressMessage && (
            <span className="text-xs text-blue-600 animate-pulse">{toolCall.progressMessage}</span>
          )}
        </div>
        <span className="ml-auto text-xs text-gray-400">{expanded ? 'Hide' : 'Show'} details</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-200 text-xs">
          <div className="mb-2">
            <span className="font-semibold text-gray-500">Arguments:</span>
            <pre className="mt-1 p-2 bg-white rounded border overflow-x-auto whitespace-pre-wrap break-words">{parsedArgs}</pre>
          </div>
          {formattedResult && (
            <div>
              <span className="font-semibold text-gray-500">Result:</span>
              <pre className="mt-1 p-2 bg-white rounded border overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                {linkifyJsonText(formattedResult)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
