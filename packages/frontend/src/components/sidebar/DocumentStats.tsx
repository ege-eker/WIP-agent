import { FileText, Database } from 'lucide-react';
import { useDocumentStats } from '../../hooks/useDocumentStats';

export function DocumentStats() {
  const { stats, loading } = useDocumentStats();

  if (loading || !stats) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400">Loading stats...</div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <FileText className="w-3.5 h-3.5" />
        <span>{stats.totalDocuments} documents</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Database className="w-3.5 h-3.5" />
        <span>{stats.totalChunks} chunks indexed</span>
      </div>
    </div>
  );
}
