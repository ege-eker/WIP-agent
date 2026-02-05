import { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { getSession } from '../../services/chat.service';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatPageProps {
  sessionId: string | null;
  onNeedSession: () => Promise<string>;
}

export function ChatPage({ sessionId, onNeedSession }: ChatPageProps) {
  const { messages, isLoading, send, clearMessages, loadMessages } = useChat();
  const prevSessionIdRef = useRef<string | null>(sessionId);
  const skipNextLoadRef = useRef(false);

  useEffect(() => {
    const loadSession = async () => {
      // Yeni session oluşturulduğunda yükleme yapma (mesajlar zaten client'ta)
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false;
        prevSessionIdRef.current = sessionId;
        return;
      }

      if (sessionId && prevSessionIdRef.current !== sessionId) {
        // Farklı bir session'a geçildi, mesajları yükle
        try {
          const session = await getSession(sessionId);
          loadMessages(session.messages);
        } catch {
          clearMessages();
        }
      } else if (!sessionId) {
        // Session yok, temizle
        clearMessages();
      }
      prevSessionIdRef.current = sessionId;
    };

    loadSession();
  }, [sessionId, loadMessages, clearMessages]);

  const handleSend = async (text: string) => {
    let sid = sessionId;
    if (!sid) {
      // Yeni session oluşturuluyor, mesaj zaten client'ta olacak
      skipNextLoadRef.current = true;
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
