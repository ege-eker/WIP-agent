import { useState, useEffect, useCallback } from 'react';
import { DocumentStats } from '../types/api.types';
import { getDocumentStats } from '../services/document.service';

export function useDocumentStats() {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocumentStats();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
