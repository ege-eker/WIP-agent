import path from 'path';
import { IDocumentStore } from '../../core/interfaces/document-store.interface';
import { ReadFileContentInput } from '../../core/types/tool.types';
import { SupportedFileType } from '../../core/types/document.types';
import { sanitizePath } from '../../utils/path-sanitizer';
import { ParserFactory } from '../../providers/document-parser/parser-factory';

const MAX_CONTENT_LENGTH = 15000;
const parserFactory = new ParserFactory();

export async function readFileContent(
  input: ReadFileContentInput,
  documentStore: IDocumentStore
): Promise<string> {
  try {
    const fullPath = sanitizePath(input.file_path, documentStore.getBasePath());
    const buffer = await documentStore.readFile(fullPath);

    const ext = path.extname(fullPath).toLowerCase().slice(1) as SupportedFileType;
    let content: string;
    if (ext === 'pdf' || ext === 'docx') {
      const parser = parserFactory.getParser(ext);
      const parsed = await parser.parse(buffer, path.basename(fullPath));
      content = parsed.content;
    } else {
      content = buffer.toString('utf-8');
    }

    const truncated = content.length > MAX_CONTENT_LENGTH;
    if (truncated) {
      content = content.slice(0, MAX_CONTENT_LENGTH);
    }

    return JSON.stringify({
      file_path: input.file_path,
      content,
      truncated,
      totalLength: buffer.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      error: `Failed to read file: ${message}`,
      file_path: input.file_path,
    });
  }
}
