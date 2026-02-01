import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { DisplayMessage } from '../../types/chat.types';
import { ToolCallDisplay } from './ToolCallDisplay';
import { StreamingIndicator } from './StreamingIndicator';

export function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        {isUser ? (
          <div className="inline-block px-4 py-2 bg-blue-600 text-white rounded-2xl rounded-tr-sm">
            {message.content}
          </div>
        ) : (
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
            {message.content && (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            {message.isStreaming && !message.content && message.toolCalls.length === 0 && (
              <StreamingIndicator />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
