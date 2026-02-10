import * as XLSX from 'xlsx';
import { IDocumentParser, ParserProgressCallback } from '../../core/interfaces/document-parser.interface';
import { ParsedDocument, SupportedFileType } from '../../core/types/document.types';
import { DocumentParseError } from '../../core/errors/document.errors';

const MAX_ROWS_PER_SHEET = 5000;
const MAX_CONTENT_LENGTH = 200000;

export class ExcelParser implements IDocumentParser {
  async parse(buffer: Buffer, filename: string, onProgress?: ParserProgressCallback): Promise<ParsedDocument> {
    try {
      onProgress?.(`Excel dosyası okunuyor: ${filename}`, { stage: 'reading', filename });

      // Convert to Uint8Array for better compatibility with legacy .xls BIFF format
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, {
        type: 'array',
        sheetRows: MAX_ROWS_PER_SHEET,
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
        codepage: 1254, // Windows-1254 (Turkish) codepage for legacy .xls files
      });

      const totalSheets = workbook.SheetNames.length;
      onProgress?.(`${totalSheets} sayfa bulundu, işleniyor...`, { stage: 'processing', totalSheets });

      let content = '';
      let processedSheets = 0;

      for (const sheetName of workbook.SheetNames) {
        processedSheets++;
        onProgress?.(`Sayfa ${processedSheets}/${totalSheets}: "${sheetName}" işleniyor...`, {
          stage: 'sheet_processing',
          currentSheet: processedSheets,
          totalSheets,
          sheetName,
        });

        if (content.length >= MAX_CONTENT_LENGTH) {
          content += `\n\n... (content truncated at ${MAX_CONTENT_LENGTH} characters)`;
          break;
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        // Use sheet_to_csv for better performance with large files
        const csvContent = XLSX.utils.sheet_to_csv(worksheet, {
          blankrows: false,
          FS: ' | ',
          RS: '\n\n',
        });

        if (csvContent && csvContent.trim()) {
          content += `[${sheetName}]\n\n${csvContent}\n\n`;
        }
      }

      // Truncate if still too large
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n... (content truncated)';
      }

      const fileType = filename.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'xls';

      onProgress?.(`Excel dosyası başarıyla işlendi: ${processedSheets} sayfa, ${content.length} karakter`, {
        stage: 'completed',
        processedSheets,
        contentLength: content.length,
      });

      return {
        content: content || `(Empty Excel file: ${filename})`,
        metadata: { filename, fileType },
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      const isXls = filename.toLowerCase().endsWith('.xls');
      console.error(`[ExcelParser] Failed to parse ${filename} (format: ${isXls ? 'xls/BIFF' : 'xlsx'}):`, errMessage);
      if (err instanceof Error && err.stack) {
        console.error(`[ExcelParser] Stack:`, err.stack);
      }
      throw new DocumentParseError(
        filename,
        `Excel parsing failed (${isXls ? '.xls BIFF' : '.xlsx'}): ${errMessage}`
      );
    }
  }

  supports(fileType: SupportedFileType): boolean {
    return fileType === 'xls' || fileType === 'xlsx';
  }
}
