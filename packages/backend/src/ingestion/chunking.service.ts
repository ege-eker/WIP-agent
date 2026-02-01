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
      chunks.push({ content: currentChunk.trim(), chunkIndex });
    }

    // Handle case where single text block exceeds chunk size
    if (chunks.length === 0 && text.trim()) {
      return this.chunkBySize(text.trim());
    }

    return chunks;
  }

  private chunkBySize(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push({ content: text.slice(start, end), chunkIndex });
      chunkIndex++;
      start = end - this.overlap;
      if (start >= text.length) break;
    }

    return chunks;
  }
}
