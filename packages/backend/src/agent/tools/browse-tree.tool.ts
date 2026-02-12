import { IDocumentStore, TreeNode } from '../../core/interfaces/document-store.interface';
import { BrowseTreeInput } from '../../core/types/tool.types';

function countStats(node: TreeNode): { totalDirs: number; totalFiles: number } {
  let totalDirs = 0;
  let totalFiles = 0;

  if (node.type === 'directory') {
    totalDirs++;
    if (node.children) {
      for (const child of node.children) {
        const childStats = countStats(child);
        totalDirs += childStats.totalDirs;
        totalFiles += childStats.totalFiles;
      }
    }
    // If no children but fileCount exists (max depth reached or >10 files), add those
    if (!node.children && node.fileCount) {
      totalFiles += node.fileCount;
    } else if (node.fileCount) {
      // fileCount tracks direct files; children may not include all files (>10 case)
      const fileChildren = node.children?.filter((c) => c.type === 'file').length ?? 0;
      if (fileChildren === 0 && node.fileCount > 0) {
        totalFiles += node.fileCount;
      }
    }
  } else {
    totalFiles++;
  }

  return { totalDirs, totalFiles };
}

export async function browseTree(
  input: BrowseTreeInput,
  documentStore: IDocumentStore
): Promise<string> {
  const relativePath = (input.path || '').normalize('NFC');
  const maxDepth = Math.min(Math.max(input.max_depth ?? 3, 1), 5);

  try {
    const tree = await documentStore.listTree(relativePath, maxDepth);
    const stats = countStats(tree);

    return JSON.stringify({
      path: relativePath || '/',
      tree,
      stats: { totalDirs: stats.totalDirs - 1, totalFiles: stats.totalFiles }, // -1 to exclude root itself
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      error: `Failed to browse tree: ${message}`,
      path: relativePath,
    });
  }
}
