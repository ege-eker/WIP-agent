import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatPageProps {
  sessionId: string | null;
  onNeedSession: () => Promise<string>;
}

export function ChatPage({ sessionId, onNeedSession }: ChatPageProps) {
  const { messages, isLoading, send } = useChat();

  const handleSend = async (text: string) => {
    let sid = sessionId;
    if (!sid) {
      sid = await onNeedSession();
    }
    send(sid, text);
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
