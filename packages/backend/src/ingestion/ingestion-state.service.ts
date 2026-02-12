import fs from 'fs/promises';
import path from 'path';

interface FileState {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  indexedAt: string;
}

interface IngestionState {
  files: Record<string, FileState>;
}

export class IngestionStateService {
  private state: IngestionState = { files: {} };
  private statePath: string;

  constructor(basePath: string) {
    // Store state outside the documents folder so clearing documents doesn't erase it
    const dataDir = path.join(path.dirname(basePath), 'data');
    this.statePath = path.join(dataDir, 'ingestion-state.json');
  }

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      this.state = { files: {} };
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
    await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2));
  }

  needsReindex(filePath: string, sizeBytes: number, modifiedAt: Date): boolean {
    const existing = this.state.files[filePath];
    if (!existing) return true;
    return (
      existing.sizeBytes !== sizeBytes ||
      existing.modifiedAt !== modifiedAt.toISOString()
    );
  }

  markIndexed(filePath: string, sizeBytes: number, modifiedAt: Date): void {
    this.state.files[filePath] = {
      path: filePath,
      sizeBytes,
      modifiedAt: modifiedAt.toISOString(),
      indexedAt: new Date().toISOString(),
    };
  }

  getIndexedPaths(): string[] {
    return Object.keys(this.state.files);
  }

  removePath(filePath: string): void {
    delete this.state.files[filePath];
  }
}
