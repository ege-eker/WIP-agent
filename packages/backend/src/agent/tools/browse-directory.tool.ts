import { IDocumentStore } from '../../core/interfaces/document-store.interface';
import { BrowseDirectoryInput } from '../../core/types/tool.types';

export async function browseDirectory(
  input: BrowseDirectoryInput,
  documentStore: IDocumentStore
): Promise<string> {
  const relativePath = input.path || '';

  try {
    const entries = await documentStore.listDirectory(relativePath);

    // Sort: directories first, then files, alphabetical within each group
    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return JSON.stringify({
      path: relativePath || '/',
      entries: entries.map((e) => ({
        name: e.name,
        type: e.type,
        ...(e.sizeBytes !== undefined && { sizeBytes: e.sizeBytes }),
        ...(e.modifiedAt !== undefined && { modifiedAt: e.modifiedAt }),
      })),
      totalCount: entries.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      error: `Failed to browse directory: ${message}`,
      path: relativePath,
    });
  }
}
