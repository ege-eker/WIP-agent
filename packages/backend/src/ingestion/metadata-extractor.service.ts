import path from 'path';
import { FolderStructureProfile } from './structure-analyzer.service';

export interface ExtractedMetadata {
  year?: string;
  category?: string;
}

export class MetadataExtractorService {
  private yearPattern = /\b(19|20)\d{2}\b/;

  extract(filePath: string, basePath: string, profile?: FolderStructureProfile): ExtractedMetadata {
    const relativePath = path.relative(basePath, filePath);
    const parts = relativePath.split(path.sep);
    const filename = path.basename(filePath);

    if (profile) {
      return this.extractWithProfile(parts, filename, profile);
    }

    // Fallback: original behaviour for backward compatibility
    const year = this.extractYear(parts, filename);
    const category = this.extractCategory(parts);
    return { year, category };
  }

  private extractWithProfile(parts: string[], filename: string, profile: FolderStructureProfile): ExtractedMetadata {
    const dirParts = parts.slice(0, -1); // exclude filename

    let year: string | undefined;
    let category: string | undefined;

    if (profile.yearLevel !== null && dirParts[profile.yearLevel]) {
      const match = dirParts[profile.yearLevel].match(this.yearPattern);
      if (match) year = match[0];
    }

    if (profile.categoryLevel !== null && dirParts[profile.categoryLevel]) {
      const val = dirParts[profile.categoryLevel];
      if (!this.yearPattern.test(val)) {
        category = val;
      }
    }

    // If profile-based extraction didn't find year, fall back to scanning all parts
    if (!year) {
      year = this.extractYear(parts, filename);
    }

    // If profile says there IS a category level but we didn't extract one, fall back.
    // If profile says categoryLevel is null, don't guess — there's genuinely no category.
    if (!category && profile.categoryLevel !== null) {
      category = this.extractCategory(parts);
    }

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
