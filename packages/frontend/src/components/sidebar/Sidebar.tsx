import { useState } from 'react';
import { Plus, FileSearch, Brain, ChevronsUpDown } from 'lucide-react';
import { ChatSession } from '../../types/api.types';
import { SessionList } from './SessionList';
import { DocumentStats } from './DocumentStats';

const LOGO_SRC = '/logo.png';

function SidebarLogo() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="px-4 pt-5 pb-4 flex justify-center">
      <img
        src={LOGO_SRC}
        alt="Logo"
        className="max-h-12 object-contain"
        onError={() => setVisible(false)}
      />
    </div>
  );
}

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
        <SidebarLogo />
        <div className="flex items-center gap-2 mb-4">
          <div className="relative w-10 h-10 shrink-0">
            <FileSearch className="w-10 h-10 text-blue-400" />
            <span className="absolute -bottom-1 -right-1 bg-gray-800 rounded-sm p-0.5">
              <Brain className="w-4 h-4 text-blue-400 block" />
            </span>
          </div>
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

      <div className="px-4 py-3 border-t border-gray-700 flex items-center gap-3">
        <img
          src="https://i.pravatar.cc/40?img=12"
          alt="Profil"
          className="w-8 h-8 rounded-full shrink-0 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
          }}
        />
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center text-xs font-semibold shrink-0 select-none hidden"
          aria-hidden
        >
          AY
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">Ahmet Yılmaz</p>
          <p className="text-xs text-gray-400 truncate">ahmet@sirket.com</p>
        </div>
        <button className="shrink-0 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
          <ChevronsUpDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
