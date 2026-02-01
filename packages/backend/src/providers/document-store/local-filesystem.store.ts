import fs from 'fs/promises';
import path from 'path';
import { IDocumentStore, FileInfo, DirectoryEntry } from '../../core/interfaces/document-store.interface';
import { sanitizePath } from '../../utils/path-sanitizer';

export class LocalFilesystemStore implements IDocumentStore {
  constructor(private basePath: string) {}

  async listFiles(extensions: string[]): Promise<FileInfo[]> {
    const results: FileInfo[] = [];
    await this.walkDir(this.basePath, extensions, results);
    return results;
  }

  private async walkDir(dir: string, extensions: string[], results: FileInfo[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walkDir(fullPath, extensions, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase().slice(1);
        if (extensions.includes(ext)) {
          const stat = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            filename: entry.name,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime,
          });
        }
      }
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getBasePath(): string {
    return this.basePath;
  }

  async listDirectory(relativePath: string): Promise<DirectoryEntry[]> {
    const fullPath = sanitizePath(relativePath, this.basePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const results: DirectoryEntry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push({ name: entry.name, type: 'directory' });
      } else if (entry.isFile()) {
        const stat = await fs.stat(path.join(fullPath, entry.name));
        results.push({
          name: entry.name,
          type: 'file',
          sizeBytes: stat.size,
          modifiedAt: stat.mtime,
        });
      }
    }

    return results;
  }

  async getFileStats(relativePath: string): Promise<FileInfo | null> {
    const fullPath = sanitizePath(relativePath, this.basePath);
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) {
        return null;
      }
      return {
        path: fullPath,
        filename: path.basename(fullPath),
        sizeBytes: stat.size,
        modifiedAt: stat.mtime,
      };
    } catch {
      return null;
    }
  }
}
