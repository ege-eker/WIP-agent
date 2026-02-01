import { IDocumentParser } from '../../core/interfaces/document-parser.interface';
import { ParsedDocument, SupportedFileType } from '../../core/types/document.types';

export class TxtParser implements IDocumentParser {
  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    const content = buffer.toString('utf-8');
    return {
      content,
      metadata: { filename, fileType: 'txt' },
    };
  }

  supports(fileType: SupportedFileType): boolean {
    return fileType === 'txt';
  }
}
