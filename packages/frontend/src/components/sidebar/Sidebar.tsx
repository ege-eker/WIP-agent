import { Plus, FileSearch } from 'lucide-react';
import { ChatSession } from '../../types/api.types';
import { SessionList } from './SessionList';
import { DocumentStats } from './DocumentStats';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

export function Sidebar({ sessions, activeSessionId, onNewChat, onSelectSession }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <FileSearch className="w-5 h-5 text-blue-400" />
          <h1 className="font-semibold text-sm">Document Search AI</h1>
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-600 text-sm hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <SessionList
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={onSelectSession}
      />

      <div className="border-t border-gray-700">
        <DocumentStats />
      </div>
    </div>
  );
}
