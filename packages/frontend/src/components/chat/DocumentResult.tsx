import { FileText } from 'lucide-react';

interface DocumentResultProps {
  filename: string;
  path: string;
  score?: number;
  preview?: string;
}

export function DocumentResult({ filename, path, score, preview }: DocumentResultProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors">
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{filename}</span>
            {score !== undefined && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {Math.round(score * 100)}% match
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">{path}</p>
          {preview && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{preview}</p>
          )}
        </div>
      </div>
    </div>
  );
}
