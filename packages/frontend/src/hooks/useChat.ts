import { useState, useCallback } from 'react';
import { DisplayMessage, ToolCallDisplay, SSEEvent } from '../types/chat.types';
import { ChatMessage } from '../types/api.types';
import { sendMessage } from '../services/chat.service';
import { useSSE } from './useSSE';

let messageIdCounter = 0;

export function useChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { processStream } = useSSE();

  const loadMessages = useCallback((chatMessages: ChatMessage[]) => {
    const displayMessages: DisplayMessage[] = chatMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: `msg-${++messageIdCounter}`,
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
        toolCalls: [],
        isStreaming: false,
      }));
    setMessages(displayMessages);
  }, []);

  const send = useCallback(
    async (sessionId: string, text: string) => {
      const userMsg: DisplayMessage = {
        id: `msg-${++messageIdCounter}`,
        role: 'user',
        content: text,
        toolCalls: [],
        isStreaming: false,
      };

      const assistantMsg: DisplayMessage = {
        id: `msg-${++messageIdCounter}`,
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const response = await sendMessage(sessionId, text);
        if (!response.ok) {
          throw new Error('Chat request failed');
        }

        await processStream(response, (event: SSEEvent) => {
          setMessages((prev) => {
            const msgs = [...prev];
            const last = { ...msgs[msgs.length - 1] };

            switch (event.type) {
              case 'text_delta':
                last.content += event.data as string;
                break;
              case 'tool_call_start': {
                const tc = event.data as { id: string; name: string; arguments: string };
                const newTc: ToolCallDisplay = {
                  id: tc.id,
                  name: tc.name,
                  arguments: tc.arguments,
                  status: 'running',
                };
                last.toolCalls = [...last.toolCalls, newTc];
                break;
              }
              case 'tool_call_result': {
                const result = event.data as { id: string; name: string; result: string };
                last.toolCalls = last.toolCalls.map((tc) =>
                  tc.id === result.id
                    ? { ...tc, result: result.result, status: 'completed' as const }
                    : tc
                );
                break;
              }
              case 'done':
                last.isStreaming = false;
                break;
              case 'error':
                last.isStreaming = false;
                last.content += '\n\n[Error occurred while processing]';
                break;
            }

            msgs[msgs.length - 1] = last;
            return msgs;
          });
        });
      } catch {
        setMessages((prev) => {
          const msgs = [...prev];
          const last = { ...msgs[msgs.length - 1] };
          last.isStreaming = false;
          last.content = 'An error occurred. Please try again.';
          msgs[msgs.length - 1] = last;
          return msgs;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [processStream]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, send, clearMessages, loadMessages };
}
