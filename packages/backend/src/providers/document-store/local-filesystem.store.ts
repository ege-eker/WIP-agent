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
    // Try reading with the original path first
    try {
      return await fs.readFile(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;

      // If file not found, try with alternate Unicode normalization
      const resolvedPath = await this.resolveUnicodePath(filePath);
      if (resolvedPath) {
        return fs.readFile(resolvedPath);
      }
      throw err;
    }
  }

  private async resolveUnicodePath(filePath: string): Promise<string | null> {
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);

    try {
      const entries = await fs.readdir(dir);
      // Try to find a file that matches when normalized
      const nfcFilename = filename.normalize('NFC');
      const nfdFilename = filename.normalize('NFD');

      for (const entry of entries) {
        const entryNfc = entry.normalize('NFC');
        const entryNfd = entry.normalize('NFD');

        if (
          entryNfc === nfcFilename ||
          entryNfd === nfdFilename ||
          entryNfc === nfdFilename ||
          entryNfd === nfcFilename
        ) {
          return path.join(dir, entry);
        }
      }
    } catch {
      // Directory doesn't exist or not accessible
    }

    return null;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      const resolved = await this.resolveUnicodePath(filePath);
      return resolved !== null;
    }
  }

  getBasePath(): string {
    return this.basePath;
  }

  async listDirectory(relativePath: string): Promise<DirectoryEntry[]> {
    let fullPath = sanitizePath(relativePath, this.basePath);

    // Try with Unicode normalization fallback
    try {
      await fs.access(fullPath);
    } catch {
      const resolved = await this.resolveUnicodePath(fullPath);
      if (resolved) {
        fullPath = resolved;
      }
    }

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
    let fullPath = sanitizePath(relativePath, this.basePath);

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
      // Try with Unicode normalization fallback
      const resolved = await this.resolveUnicodePath(fullPath);
      if (resolved) {
        try {
          const stat = await fs.stat(resolved);
          if (!stat.isFile()) {
            return null;
          }
          return {
            path: resolved,
            filename: path.basename(resolved),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime,
          };
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
