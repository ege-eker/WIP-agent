import { IDocumentStore, FileInfo } from '../core/interfaces/document-store.interface';
import { SupportedFileType } from '../core/types/document.types';

const SUPPORTED_EXTENSIONS: SupportedFileType[] = ['pdf', 'docx', 'txt'];

export class FileDiscoveryService {
  constructor(private documentStore: IDocumentStore) {}

  async discoverFiles(): Promise<FileInfo[]> {
    return this.documentStore.listFiles(SUPPORTED_EXTENSIONS);
  }
}
