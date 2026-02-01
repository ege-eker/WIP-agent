import { IDocumentStore } from '../../core/interfaces/document-store.interface';
import { GetFileInfoInput } from '../../core/types/tool.types';

export async function getFileInfo(
  input: GetFileInfoInput,
  documentStore: IDocumentStore
): Promise<string> {
  try {
    const stats = await documentStore.getFileStats(input.file_path);

    if (!stats) {
      return JSON.stringify({
        error: `File not found or is not a file: ${input.file_path}`,
        info: null,
      });
    }

    return JSON.stringify({
      filename: stats.filename,
      path: stats.path,
      sizeBytes: stats.sizeBytes,
      modifiedAt: stats.modifiedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      error: `Failed to get file info: ${message}`,
      file_path: input.file_path,
    });
  }
}
