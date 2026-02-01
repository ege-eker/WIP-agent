import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { IEmbeddingProvider } from '../../core/interfaces/embedding-provider.interface';
import { SearchDocumentsInput } from '../../core/types/tool.types';

export async function searchDocuments(
  input: SearchDocumentsInput,
  vectorStore: IVectorStore,
  embeddingProvider: IEmbeddingProvider
): Promise<string> {
  const topK = Math.min(input.top_k || 5, 20);
  const embedding = await embeddingProvider.embed(input.query);

  const where: Record<string, string> = {};
  if (input.year) where.year = input.year;
  if (input.category) where.category = input.category;

  const results = await vectorStore.search(embedding, { topK, where });

  if (results.length === 0) {
    return JSON.stringify({ message: 'No documents found matching the query.', results: [] });
  }

  return JSON.stringify({
    message: `Found ${results.length} relevant document chunks.`,
    results: results.map((r) => ({
      filename: r.filename,
      path: r.documentPath,
      chunkIndex: r.chunkIndex,
      score: Math.round(r.score * 1000) / 1000,
      preview: r.preview,
      year: r.metadata.year,
      category: r.metadata.category,
      fileType: r.metadata.fileType,
    })),
  });
}
