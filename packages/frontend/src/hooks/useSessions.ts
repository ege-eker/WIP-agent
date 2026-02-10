import { useState, useCallback, useEffect } from 'react';
import { ChatSession } from '../types/api.types';
import { createSession, listSessions, getSession } from '../services/chat.service';

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async () => {
    const session = await createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const select = useCallback(async (id: string) => {
    setActiveSessionId(id);
    return getSession(id);
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  }, []);

  return { sessions, activeSessionId, create, select, refresh, updateTitle };
}
