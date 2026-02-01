import { IDocumentParser } from '../../core/interfaces/document-parser.interface';
import { SupportedFileType } from '../../core/types/document.types';
import { UnsupportedFileTypeError } from '../../core/errors/document.errors';
import { TxtParser } from './txt.parser';
import { DocxParser } from './docx.parser';
import { PdfParser } from './pdf.parser';

export class ParserFactory {
  private parsers: IDocumentParser[];

  constructor() {
    this.parsers = [new TxtParser(), new DocxParser(), new PdfParser()];
  }

  getParser(fileType: SupportedFileType): IDocumentParser {
    const parser = this.parsers.find((p) => p.supports(fileType));
    if (!parser) {
      throw new UnsupportedFileTypeError(fileType);
    }
    return parser;
  }
}
