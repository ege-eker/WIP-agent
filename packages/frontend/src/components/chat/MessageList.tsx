import { useEffect, useRef } from 'react';
import { DisplayMessage } from '../../types/chat.types';
import { MessageBubble } from './MessageBubble';

export function MessageList({ messages }: { messages: DisplayMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0 min-w-0">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
