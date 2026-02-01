import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { ReadDocumentChunkInput } from '../../core/types/tool.types';

export async function readDocumentChunk(
  input: ReadDocumentChunkInput,
  vectorStore: IVectorStore
): Promise<string> {
  let chunkIndex = input.chunk_index;

  if (input.read_adjacent === 'next') {
    chunkIndex += 1;
  } else if (input.read_adjacent === 'previous') {
    chunkIndex = Math.max(0, chunkIndex - 1);
  }

  const chunk = await vectorStore.getDocumentChunk(input.document_path, chunkIndex);

  if (!chunk) {
    return JSON.stringify({
      message: `Chunk not found at index ${chunkIndex} for document: ${input.document_path}`,
      content: null,
    });
  }

  return JSON.stringify({
    documentPath: chunk.documentPath,
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.metadata.chunkCount,
    filename: chunk.metadata.filename,
    content: chunk.content,
  });
}
