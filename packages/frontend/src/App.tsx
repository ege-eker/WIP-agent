import { useCallback } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './components/chat/ChatPage';
import { useSessions } from './hooks/useSessions';

export default function App() {
  const { sessions, activeSessionId, create, select, updateTitle } = useSessions();

  const handleNewChat = useCallback(async () => {
    await create();
  }, [create]);

  const handleSelectSession = useCallback(
    async (id: string) => {
      await select(id);
    },
    [select]
  );

  const handleNeedSession = useCallback(async () => {
    const session = await create();
    return session.id;
  }, [create]);

  return (
    <div className="flex h-full min-h-0">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />
      <main className="flex-1 flex flex-col bg-gray-50 min-w-0 min-h-0">
        <ChatPage
          sessionId={activeSessionId}
          onNeedSession={handleNeedSession}
          onUpdateTitle={updateTitle}
        />
      </main>
    </div>
  );
}
