import { apiFetch, apiStreamFetch } from './api.service';
import { ChatSession } from '../types/api.types';

export async function createSession(title?: string): Promise<ChatSession> {
  return apiFetch('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function listSessions(): Promise<ChatSession[]> {
  return apiFetch('/chat/sessions');
}

export async function getSession(id: string): Promise<ChatSession> {
  return apiFetch(`/chat/sessions/${id}`);
}

export async function sendMessage(sessionId: string, message: string): Promise<Response> {
  return apiStreamFetch('/chat', { sessionId, message });
}
