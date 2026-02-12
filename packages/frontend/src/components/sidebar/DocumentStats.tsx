import { useState } from 'react';
import { FileText, Database, RefreshCw } from 'lucide-react';
import { useDocumentStats } from '../../hooks/useDocumentStats';
import { triggerIngestion } from '../../services/document.service';
import { IngestionResult } from '../../types/api.types';

export function DocumentStats() {
  const { stats, loading, refresh } = useDocumentStats();
  const [ingesting, setIngesting] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);

  const handleIngest = async () => {
    setIngesting(true);
    setResult(null);
    try {
      const res = await triggerIngestion();
      setResult(res);
      refresh();
    } catch {
      setResult(null);
    } finally {
      setIngesting(false);
    }
  };

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

      <button
        onClick={handleIngest}
        disabled={ingesting}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-gray-600 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
        {ingesting ? 'Indexing...' : 'Re-index Documents'}
      </button>

      {result && (
        <div className="text-xs text-gray-500 space-y-0.5">
          <span className="text-green-400">{result.processedFiles} indexed</span>
          {result.skippedFiles > 0 && <span>, {result.skippedFiles} skipped</span>}
          {result.cleanedFiles > 0 && <span>, {result.cleanedFiles} cleaned</span>}
          {result.failedFiles > 0 && <span className="text-red-400">, {result.failedFiles} failed</span>}
        </div>
      )}
    </div>
  );
}
