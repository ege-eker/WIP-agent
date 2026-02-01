import { IVectorStore } from '../../core/interfaces/vector-store.interface';
import { ListCategoriesInput } from '../../core/types/tool.types';

export async function listCategories(
  input: ListCategoriesInput,
  vectorStore: IVectorStore
): Promise<string> {
  const groups = await vectorStore.listCategories(input.group_by);

  if (groups.length === 0) {
    return JSON.stringify({ message: 'No categories found.', groups: [] });
  }

  return JSON.stringify({
    message: `Found ${groups.length} groups.`,
    groups: groups.map((g) => ({
      name: g.name,
      documentCount: g.documentCount,
    })),
  });
}
