import { v4 as uuidv4 } from 'uuid';
import { ChatSession, ChatMessage } from '../core/types/chat.types';
import { SessionStore } from './session.store';

export class SessionService {
  constructor(private store: SessionStore) {}

  create(title?: string): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(session);
    return session;
  }

  get(id: string): ChatSession | undefined {
    return this.store.get(id);
  }

  list(): ChatSession[] {
    return this.store.list();
  }

  addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.store.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = new Date().toISOString();
      // Auto-update title from first user message
      if (message.role === 'user' && session.messages.filter((m) => m.role === 'user').length === 1) {
        session.title = (message.content || '').slice(0, 60) || 'New Chat';
      }
      this.store.set(session);
    }
  }

  getHistory(sessionId: string): ChatMessage[] {
    const session = this.store.get(sessionId);
    return session ? session.messages : [];
  }
}
