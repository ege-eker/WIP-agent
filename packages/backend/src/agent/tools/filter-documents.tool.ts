import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { FilterDocumentsInput } from '../../core/types/tool.types';

export async function filterDocuments(
  input: FilterDocumentsInput,
  vectorStore: IVectorStore
): Promise<string> {
  const limit = input.limit || 20;
  const results = await vectorStore.filterDocuments({ ...input, limit });

  if (results.length === 0) {
    return JSON.stringify({ message: 'No documents match the filter criteria.', documents: [] });
  }

  return JSON.stringify({
    message: `Found ${results.length} documents.`,
    documents: results.map((d) => ({
      filename: d.filename,
      path: d.path,
      fileType: d.fileType,
      sizeBytes: d.sizeBytes,
      year: d.year,
      category: d.category,
    })),
  });
}
