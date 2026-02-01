import { useCallback } from 'react';
import { SSEEvent } from '../types/chat.types';

export function useSSE() {
  const processStream = useCallback(
    async (response: Response, onEvent: (event: SSEEvent) => void) => {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              onEvent(parsed);
            } catch {
              // skip malformed events
            }
          }
        }
      }
    },
    []
  );

  return { processStream };
}
