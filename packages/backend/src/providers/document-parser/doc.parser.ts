import WordExtractor from 'word-extractor';
import { IDocumentParser } from '../../core/interfaces/document-parser.interface';
import { ParsedDocument, SupportedFileType } from '../../core/types/document.types';
import { DocumentParseError } from '../../core/errors/document.errors';

export class DocParser implements IDocumentParser {
  private extractor: WordExtractor;

  constructor() {
    this.extractor = new WordExtractor();
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      const doc = await this.extractor.extract(buffer);
      const content = doc.getBody();

      return {
        content,
        metadata: { filename, fileType: 'doc' },
      };
    } catch (err) {
      throw new DocumentParseError(filename, err instanceof Error ? err.message : 'Unknown error');
    }
  }

  supports(fileType: SupportedFileType): boolean {
    return fileType === 'doc';
  }
}
