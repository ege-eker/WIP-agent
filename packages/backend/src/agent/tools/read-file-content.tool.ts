import path from 'path';
import { IDocumentStore } from '../../core/interfaces/document-store.interface';
import { ReadFileContentInput } from '../../core/types/tool.types';
import { SupportedFileType } from '../../core/types/document.types';
import { ToolProgressCallback } from '../../core/types/chat.types';
import { sanitizePath } from '../../utils/path-sanitizer';
import { ParserFactory } from '../../providers/document-parser/parser-factory';

const MAX_CONTENT_LENGTH = 15000;
const parserFactory = new ParserFactory();
const PARSEABLE_EXTENSIONS = ['pdf', 'docx', 'doc', 'xls', 'xlsx'];

export async function readFileContent(
  input: ReadFileContentInput,
  documentStore: IDocumentStore,
  onProgress?: ToolProgressCallback
): Promise<string> {
  try {
    // Normalize Unicode to handle NFD vs NFC differences in filenames
    const normalizedPath = input.file_path.normalize('NFC');
    const fullPath = sanitizePath(normalizedPath, documentStore.getBasePath());
    const buffer = await documentStore.readFile(fullPath);

    const ext = path.extname(fullPath).toLowerCase().slice(1) as SupportedFileType;
    let content: string;
    let ocrApplied = false;
    let ocrConfidence: number | undefined;
    let ocrPageCount: number | undefined;

    if (PARSEABLE_EXTENSIONS.includes(ext)) {
      const parser = parserFactory.getParser(ext);
      const parsed = await parser.parse(buffer, path.basename(fullPath), onProgress);
      content = parsed.content;
      ocrApplied = parsed.ocrApplied || false;
      ocrConfidence = parsed.ocrConfidence;
      ocrPageCount = parsed.ocrPageCount;
    } else {
      content = buffer.toString('utf-8');
    }

    const truncated = content.length > MAX_CONTENT_LENGTH;
    if (truncated) {
      content = content.slice(0, MAX_CONTENT_LENGTH);
    }

    const response: Record<string, any> = {
      file_path: input.file_path,
      content,
      truncated,
      totalLength: buffer.length,
    };

    if (ocrApplied) {
      response.ocrApplied = true;
      response.ocrConfidence = ocrConfidence;
      response.ocrPageCount = ocrPageCount;
      response.ocrNote = `Bu dosya taranmış/görsel bir PDF olduğu için OCR (optik karakter tanıma) ile okundu. ${ocrPageCount} sayfa işlendi, güven oranı: %${ocrConfidence}`;
    }

    return JSON.stringify(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      error: `Failed to read file: ${message}`,
      file_path: input.file_path,
    });
  }
}
