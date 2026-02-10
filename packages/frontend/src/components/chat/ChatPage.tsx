import { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { getSession } from '../../services/chat.service';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatPageProps {
  sessionId: string | null;
  onNeedSession: () => Promise<string>;
  onUpdateTitle: (id: string, title: string) => void;
}

export function ChatPage({ sessionId, onNeedSession, onUpdateTitle }: ChatPageProps) {
  const { messages, isLoading, send, clearMessages, loadMessages } = useChat();
  const prevSessionIdRef = useRef<string | null>(sessionId);
  const skipNextLoadRef = useRef(false);
  const isFirstMessageRef = useRef(true);

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
          // Mevcut session'da kullanıcı mesajı varsa ilk mesaj gönderilmiş demektir
          isFirstMessageRef.current = !session.messages.some((m) => m.role === 'user');
        } catch {
          clearMessages();
          isFirstMessageRef.current = true;
        }
      } else if (!sessionId) {
        // Session yok, temizle
        clearMessages();
        isFirstMessageRef.current = true;
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

    // İlk mesajda sidebar'daki title'ı güncelle
    if (isFirstMessageRef.current) {
      isFirstMessageRef.current = false;
      const title = text.slice(0, 60) || 'New Chat';
      onUpdateTitle(sid, title);
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
