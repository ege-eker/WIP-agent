import mammoth from 'mammoth';
import { IDocumentParser } from '../../core/interfaces/document-parser.interface';
import { ParsedDocument, SupportedFileType } from '../../core/types/document.types';
import { DocumentParseError } from '../../core/errors/document.errors';

export class DocxParser implements IDocumentParser {
  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        content: result.value,
        metadata: { filename, fileType: 'docx' },
      };
    } catch (err) {
      throw new DocumentParseError(filename, err instanceof Error ? err.message : 'Unknown error');
    }
  }

  supports(fileType: SupportedFileType): boolean {
    return fileType === 'docx';
  }
}
