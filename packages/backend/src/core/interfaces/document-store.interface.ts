export interface FileInfo {
  path: string;
  filename: string;
  sizeBytes: number;
  modifiedAt: Date;
}

export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  sizeBytes?: number;
  modifiedAt?: Date;
}

export interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  fileCount?: number;
  sizeBytes?: number;
}

export interface IDocumentStore {
  listFiles(extensions: string[]): Promise<FileInfo[]>;
  readFile(filePath: string): Promise<Buffer>;
  exists(filePath: string): Promise<boolean>;
  getBasePath(): string;
  listDirectory(relativePath: string): Promise<DirectoryEntry[]>;
  getFileStats(relativePath: string): Promise<FileInfo | null>;
  listTree(relativePath: string, maxDepth: number): Promise<TreeNode>;
}
