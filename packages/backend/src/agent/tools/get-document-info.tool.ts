import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { GetDocumentInfoInput } from '../../core/types/tool.types';

export async function getDocumentInfo(
  input: GetDocumentInfoInput,
  vectorStore: IVectorStore
): Promise<string> {
  // Normalize Unicode to handle Turkish characters
  const documentPath = input.document_path.normalize('NFC');
  const metadata = await vectorStore.getDocumentMetadata(documentPath);

  if (!metadata) {
    return JSON.stringify({
      message: `Document not found: ${input.document_path}`,
      info: null,
    });
  }

  // Get first chunk for preview
  const firstChunk = await vectorStore.getDocumentChunk(input.document_path, 0);
  const preview = firstChunk ? firstChunk.content.slice(0, 300) : '';

  return JSON.stringify({
    filename: metadata.filename,
    path: metadata.path,
    year: metadata.year,
    category: metadata.category,
    fileType: metadata.fileType,
    sizeBytes: metadata.sizeBytes,
    chunkCount: metadata.chunkCount,
    preview,
  });
}
