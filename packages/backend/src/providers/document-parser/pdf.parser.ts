import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { IDocumentParser } from '../../core/interfaces/document-parser.interface';
import { ParsedDocument, SupportedFileType } from '../../core/types/document.types';
import { DocumentParseError } from '../../core/errors/document.errors';

export class PdfParser implements IDocumentParser {
  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    try {
      const data = new Uint8Array(buffer);
      const pdf = await getDocument({ data, useSystemFonts: true }).promise;

      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => item.str)
          .join(' ');
        pages.push(text);
      }

      return {
        content: pages.join('\n'),
        metadata: { filename, fileType: 'pdf' },
      };
    } catch (err) {
      throw new DocumentParseError(filename, err instanceof Error ? err.message : 'Unknown error');
    }
  }

  supports(fileType: SupportedFileType): boolean {
    return fileType === 'pdf';
  }
}
