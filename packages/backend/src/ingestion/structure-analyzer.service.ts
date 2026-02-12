import path from 'path';
import { FileInfo } from '../core/interfaces/document-store.interface';

export type FolderPattern = 'category-year' | 'year-category' | 'flat' | 'category-only' | 'year-only' | 'deep-nested' | 'unorganized';

export interface FolderStructureProfile {
  pattern: FolderPattern;
  maxDepth: number;
  categoryLevel: number | null;
  yearLevel: number | null;
  categories: string[];
  years: string[];
  summary: string;
}

const YEAR_REGEX = /\b(19|20)\d{2}\b/;
const YEAR_THRESHOLD = 0.7;

export class StructureAnalyzerService {
  analyze(files: FileInfo[], basePath: string): FolderStructureProfile {
    const relativePaths = files.map((f) => path.relative(basePath, f.path));

    // Collect unique values at each directory level
    const levelValues = new Map<number, Set<string>>();
    let maxDepth = 0;
    let rootFileCount = 0;

    // Count how many files each level-0 folder contains
    const level0FileCounts = new Map<string, number>();

    for (const relPath of relativePaths) {
      const parts = relPath.split(path.sep);
      const dirParts = parts.slice(0, -1); // exclude filename
      maxDepth = Math.max(maxDepth, dirParts.length);

      if (dirParts.length === 0) {
        rootFileCount++;
      } else {
        level0FileCounts.set(dirParts[0], (level0FileCounts.get(dirParts[0]) || 0) + 1);
      }

      for (let i = 0; i < dirParts.length; i++) {
        if (!levelValues.has(i)) {
          levelValues.set(i, new Set());
        }
        levelValues.get(i)!.add(dirParts[i]);
      }
    }

    // All files at root → flat
    if (maxDepth === 0) {
      return this.makeProfile('flat', 0, null, null, [], []);
    }

    // ── Unorganized detection ─────────────────────────────────────────
    // Check BEFORE the main pattern logic so we can short-circuit.
    const totalFiles = files.length;
    const filesInFolders = totalFiles - rootFileCount;
    const level0Folders = level0FileCounts.size;

    const unorganized = this.isUnorganized(
      totalFiles, rootFileCount, filesInFolders, level0Folders, level0FileCounts
    );
    if (unorganized) {
      // Still capture level-0 folder names as categories for metadata extraction.
      // Pattern is "unorganized" so the prompt warns the agent, but ChromaDB
      // metadata keeps folder names → filter_documents still works.
      const level0Vals = levelValues.get(0) ?? new Set<string>();
      const cats: string[] = [];
      for (const v of level0Vals) {
        if (!YEAR_REGEX.test(v)) cats.push(v);
      }
      return this.makeProfile('unorganized', maxDepth, 0, null, cats.sort(), []);
    }

    // ── Year ratio per level ──────────────────────────────────────────
    const levelYearRatio = new Map<number, number>();
    for (const [level, values] of levelValues.entries()) {
      const yearCount = Array.from(values).filter((v) => YEAR_REGEX.test(v)).length;
      levelYearRatio.set(level, values.size > 0 ? yearCount / values.size : 0);
    }

    const level0Ratio = levelYearRatio.get(0) ?? 0;
    const level1Ratio = levelYearRatio.get(1) ?? 0;
    const level0Values = levelValues.get(0) ?? new Set<string>();
    const level1Values = levelValues.get(1) ?? new Set<string>();

    const allYears = new Set<string>();
    const allCategories = new Set<string>();

    for (const [, values] of levelValues.entries()) {
      for (const v of values) {
        const match = v.match(YEAR_REGEX);
        if (match) allYears.add(match[0]);
      }
    }

    let pattern: FolderPattern;
    let categoryLevel: number | null = null;
    let yearLevel: number | null = null;

    if (level0Ratio >= YEAR_THRESHOLD) {
      yearLevel = 0;
      for (const v of level0Values) {
        const match = v.match(YEAR_REGEX);
        if (match) allYears.add(match[0]);
      }

      if (maxDepth >= 2 && level1Ratio < YEAR_THRESHOLD && level1Values.size > 0) {
        pattern = 'year-category';
        categoryLevel = 1;
        for (const v of level1Values) {
          if (!YEAR_REGEX.test(v)) allCategories.add(v);
        }
      } else {
        pattern = 'year-only';
      }
    } else if (level0Ratio < YEAR_THRESHOLD && level0Values.size > 0) {
      categoryLevel = 0;
      for (const v of level0Values) {
        if (!YEAR_REGEX.test(v)) allCategories.add(v);
      }

      if (maxDepth >= 2 && level1Ratio >= YEAR_THRESHOLD) {
        pattern = 'category-year';
        yearLevel = 1;
      } else if (maxDepth >= 3) {
        pattern = 'deep-nested';
        for (let i = 1; i < maxDepth; i++) {
          if ((levelYearRatio.get(i) ?? 0) >= YEAR_THRESHOLD) {
            yearLevel = i;
            break;
          }
        }
      } else {
        pattern = 'category-only';
      }
    } else {
      if (maxDepth >= 3) {
        pattern = 'deep-nested';
        for (let i = 0; i < maxDepth; i++) {
          if ((levelYearRatio.get(i) ?? 0) >= YEAR_THRESHOLD && yearLevel === null) {
            yearLevel = i;
          } else if ((levelYearRatio.get(i) ?? 0) < YEAR_THRESHOLD && categoryLevel === null) {
            categoryLevel = i;
            const vals = levelValues.get(i) ?? new Set();
            for (const v of vals) {
              if (!YEAR_REGEX.test(v)) allCategories.add(v);
            }
          }
        }
      } else {
        pattern = 'flat';
      }
    }

    const categories = Array.from(allCategories).sort();
    const years = Array.from(allYears).sort();

    return this.makeProfile(pattern, maxDepth, categoryLevel, yearLevel, categories, years);
  }

  // ── Heuristics for "unorganized" ────────────────────────────────────
  private isUnorganized(
    totalFiles: number,
    rootFileCount: number,
    filesInFolders: number,
    level0Folders: number,
    level0FileCounts: Map<string, number>,
  ): boolean {
    // Heuristic 1: majority of files live at root, folders are just strays
    //   e.g. 10 root files + 1 file in stray/ → 10/11 = 91% root
    if (totalFiles > 0 && rootFileCount / totalFiles > 0.5 && level0Folders > 0) {
      return true;
    }

    // Heuristic 2: almost every level-0 folder holds only 1-2 files
    //   → no real grouping, just random dump
    //   Only trigger when there are enough folders to judge (≥ 2)
    if (level0Folders >= 2 && filesInFolders > 0) {
      const avgFilesPerFolder = filesInFolders / level0Folders;
      // Each folder has ~1 file on average AND folder count is close to file count
      if (avgFilesPerFolder <= 1.5 && level0Folders >= filesInFolders * 0.6) {
        return true;
      }
    }

    return false;
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private makeProfile(
    pattern: FolderPattern,
    maxDepth: number,
    categoryLevel: number | null,
    yearLevel: number | null,
    categories: string[],
    years: string[],
  ): FolderStructureProfile {
    return {
      pattern,
      maxDepth,
      categoryLevel,
      yearLevel,
      categories,
      years,
      summary: this.buildSummary(pattern, categoryLevel, yearLevel, categories, years),
    };
  }

  private buildSummary(
    pattern: FolderPattern,
    categoryLevel: number | null,
    yearLevel: number | null,
    categories: string[],
    years: string[]
  ): string {
    switch (pattern) {
      case 'category-year':
        return `Documents are organized in a Category/Year structure (e.g., ${categories[0] || 'HR'}/${years[0] || '2023'}/report.pdf). First-level folders are categories, second-level folders are years.`;
      case 'year-category':
        return `Documents are organized in a Year/Category structure (e.g., ${years[0] || '2023'}/${categories[0] || 'HR'}/report.pdf). First-level folders are years, second-level folders are categories.`;
      case 'flat':
        return 'All documents are in the root folder with no subdirectory structure.';
      case 'category-only':
        return `Documents are organized by category only (e.g., ${categories[0] || 'HR'}/report.pdf). No year-based folder structure detected.`;
      case 'year-only':
        return `Documents are organized by year only (e.g., ${years[0] || '2023'}/report.pdf). No category-based folder structure detected.`;
      case 'deep-nested':
        return `Documents are in a deep nested structure (${categoryLevel !== null ? `categories at level ${categoryLevel}` : 'no clear category level'}${yearLevel !== null ? `, years at level ${yearLevel}` : ', no clear year level'}).`;
      case 'unorganized':
        return 'Documents are scattered across folders with no consistent naming convention. Folder names are NOT reliable categories. Use browse_tree to explore the actual structure.';
    }
  }
}
