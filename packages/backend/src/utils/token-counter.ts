import { getEncoding, Tiktoken } from 'js-tiktoken';
import { ChatMessage } from '../core/types/chat.types';

let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = getEncoding('o200k_base');
  }
  return encoder;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}

export function countMessageTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // message overhead
    if (msg.content) {
      total += countTokens(msg.content);
    }
    if (msg.role) {
      total += countTokens(msg.role);
    }
    if (msg.name) {
      total += countTokens(msg.name) + 1;
    }
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        total += countTokens(tc.name) + countTokens(tc.arguments) + 3;
      }
    }
  }
  total += 2; // reply priming
  return total;
}

export const MAX_CONTEXT_TOKENS = 128_000;
