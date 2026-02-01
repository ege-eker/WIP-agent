import path from 'path';

export interface ExtractedMetadata {
  year?: string;
  category?: string;
}

export class MetadataExtractorService {
  private yearPattern = /\b(19|20)\d{2}\b/;

  extract(filePath: string, basePath: string): ExtractedMetadata {
    const relativePath = path.relative(basePath, filePath);
    const parts = relativePath.split(path.sep);
    const filename = path.basename(filePath);

    const year = this.extractYear(parts, filename);
    const category = this.extractCategory(parts);

    return { year, category };
  }

  private extractYear(parts: string[], filename: string): string | undefined {
    for (const part of [...parts, filename]) {
      const match = part.match(this.yearPattern);
      if (match) return match[0];
    }
    return undefined;
  }

  private extractCategory(parts: string[]): string | undefined {
    // Use the first directory as category (if there's a subdirectory structure)
    if (parts.length > 1) {
      return parts[0];
    }
    return undefined;
  }
}
