import { apiFetch } from './api.service';
import { DocumentStats, IngestionResult } from '../types/api.types';

export async function getDocumentStats(): Promise<DocumentStats> {
  return apiFetch('/documents/stats');
}

export async function triggerIngestion(): Promise<IngestionResult> {
  return apiFetch('/documents/ingest', { method: 'POST' });
}
