import fs from 'fs/promises';
import path from 'path';
import { IDocumentStore, FileInfo, DirectoryEntry, TreeNode } from '../../core/interfaces/document-store.interface';
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

  async listTree(relativePath: string, maxDepth: number): Promise<TreeNode> {
    let fullPath = sanitizePath(relativePath || '', this.basePath);

    // Unicode normalization fallback
    try {
      await fs.access(fullPath);
    } catch {
      const resolved = await this.resolveUnicodePath(fullPath);
      if (resolved) {
        fullPath = resolved;
      }
    }

    return this.buildTree(fullPath, 0, maxDepth);
  }

  private async buildTree(dir: string, currentDepth: number, maxDepth: number): Promise<TreeNode> {
    const name = currentDepth === 0 ? '/' : path.basename(dir);
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const dirs = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile());

    // At max depth, only report counts
    if (currentDepth >= maxDepth) {
      const totalFiles = await this.countFilesRecursive(dir);
      return {
        name,
        type: 'directory',
        fileCount: totalFiles,
      };
    }

    const children: TreeNode[] = [];

    // Add subdirectories recursively
    for (const d of dirs.sort((a, b) => a.name.localeCompare(b.name))) {
      const childPath = path.join(dir, d.name);
      children.push(await this.buildTree(childPath, currentDepth + 1, maxDepth));
    }

    // Add files if this directory has <= 10 files, otherwise just count
    if (files.length <= 10) {
      for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
        const stat = await fs.stat(path.join(dir, f.name));
        children.push({
          name: f.name,
          type: 'file',
          sizeBytes: stat.size,
        });
      }
    }

    return {
      name,
      type: 'directory',
      children,
      fileCount: files.length,
    };
  }

  private async countFilesRecursive(dir: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await this.countFilesRecursive(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        count++;
      }
    }
    return count;
  }
}
