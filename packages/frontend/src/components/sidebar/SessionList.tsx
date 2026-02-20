import { MessageSquare } from 'lucide-react';
import { ChatSession } from '../../types/api.types';

interface SessionListProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function SessionList({ sessions, activeId, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex-1 px-4 py-6 text-center text-xs text-gray-400">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.id)}
          className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm hover:bg-gray-700 transition-colors ${
            activeId === session.id ? 'bg-gray-700' : ''
          }`}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span className="truncate">{session.title}</span>
        </button>
      ))}
    </div>
  );
}
