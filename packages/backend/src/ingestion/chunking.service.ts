export interface TextChunk {
  content: string;
  chunkIndex: number;
}

export class ChunkingService {
  constructor(
    private chunkSize: number = 1000,
    private overlap: number = 200
  ) {}

  chunk(text: string): TextChunk[] {
    if (!text.trim()) return [];

    // For very large texts, use simple size-based chunking to avoid memory issues
    if (text.length > 500000) {
      return this.chunkBySize(text.trim());
    }

    const paragraphs = text.split(/\n\s*\n/);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length + 1 > this.chunkSize && currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), chunkIndex });
        chunkIndex++;

        // Apply overlap
        const overlapText = currentChunk.slice(-this.overlap);
        currentChunk = overlapText + '\n\n' + trimmed;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }

    if (currentChunk.trim()) {
      // If final chunk exceeds size, split it further
      if (currentChunk.length > this.chunkSize) {
        const subChunks = this.chunkBySize(currentChunk.trim());
        for (const subChunk of subChunks) {
          chunks.push({ content: subChunk.content, chunkIndex });
          chunkIndex++;
        }
      } else {
        chunks.push({ content: currentChunk.trim(), chunkIndex });
      }
    }

    // Handle case where single text block exceeds chunk size
    if (chunks.length === 0 && text.trim()) {
      return this.chunkBySize(text.trim());
    }

    // Post-process: ensure no chunk exceeds size limit
    const finalChunks: TextChunk[] = [];
    let finalIndex = 0;
    for (const chunk of chunks) {
      if (chunk.content.length > this.chunkSize) {
        const subChunks = this.chunkBySize(chunk.content);
        for (const subChunk of subChunks) {
          finalChunks.push({ content: subChunk.content, chunkIndex: finalIndex });
          finalIndex++;
        }
      } else {
        finalChunks.push({ content: chunk.content, chunkIndex: finalIndex });
        finalIndex++;
      }
    }

    return finalChunks;
  }

  private chunkBySize(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push({ content: text.slice(start, end), chunkIndex });
      chunkIndex++;
      if (end >= text.length) break;
      start = end - this.overlap;
    }

    return chunks;
  }
}
