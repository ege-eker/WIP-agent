import { ChatSession } from '../core/types/chat.types';

export class SessionStore {
  private sessions = new Map<string, ChatSession>();

  get(id: string): ChatSession | undefined {
    return this.sessions.get(id);
  }

  set(session: ChatSession): void {
    this.sessions.set(session.id, session);
  }

  list(): ChatSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }
}
