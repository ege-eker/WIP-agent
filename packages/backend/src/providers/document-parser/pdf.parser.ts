import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { IDocumentParser, ParserProgressCallback } from '../../core/interfaces/document-parser.interface';
import { ParsedDocument, SupportedFileType } from '../../core/types/document.types';
import { DocumentParseError } from '../../core/errors/document.errors';
import { ocrService } from './ocr.service';
import { pdfImageService } from './pdf-image.service';

const MIN_TEXT_LENGTH = 50;

export class PdfParser implements IDocumentParser {
  async parse(buffer: Buffer, filename: string, onProgress?: ParserProgressCallback): Promise<ParsedDocument> {
    try {
      onProgress?.('PDF dosyası analiz ediliyor...', { stage: 'analyzing' });
      const extractedText = await this.extractText(buffer);

      if (this.isTextSufficient(extractedText)) {
        return {
          content: extractedText,
          metadata: { filename, fileType: 'pdf' },
        };
      }

      console.log(`[PDF] Text extraction insufficient for ${filename}, attempting OCR...`);
      onProgress?.('Bu dosya taranmış/görsel bir PDF. OCR işlemi başlatılıyor...', { stage: 'ocr_starting' });
      return await this.parseWithOcr(buffer, filename, onProgress);
    } catch (err) {
      throw new DocumentParseError(filename, err instanceof Error ? err.message : 'Unknown error');
    }
  }

  private async extractText(buffer: Buffer): Promise<string> {
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

    return pages.join('\n');
  }

  private isTextSufficient(text: string): boolean {
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    return cleanedText.length >= MIN_TEXT_LENGTH;
  }

  private async parseWithOcr(buffer: Buffer, filename: string, onProgress?: ParserProgressCallback): Promise<ParsedDocument> {
    try {
      onProgress?.('PDF sayfaları görüntüye dönüştürülüyor...', { stage: 'converting' });
      const imageBuffers = await pdfImageService.convertToImages(buffer, filename);

      if (imageBuffers.length === 0) {
        console.log(`[PDF] No images extracted from ${filename}`);
        return {
          content: '',
          metadata: { filename, fileType: 'pdf' },
        };
      }

      onProgress?.(`${imageBuffers.length} sayfa bulundu. OCR işlemi başlıyor (bu biraz zaman alabilir)...`, {
        stage: 'ocr_processing',
        totalPages: imageBuffers.length
      });

      console.log(`[PDF] Running OCR on ${imageBuffers.length} page(s) for ${filename}...`);
      const ocrResult = await ocrService.recognizeImages(imageBuffers, (pageNum, total) => {
        onProgress?.(`OCR işleniyor: Sayfa ${pageNum}/${total}`, {
          stage: 'ocr_page',
          currentPage: pageNum,
          totalPages: total
        });
      });

      console.log(`[PDF] OCR completed for ${filename} with confidence: ${ocrResult.confidence.toFixed(1)}%`);
      onProgress?.(`OCR tamamlandı. Güven oranı: %${ocrResult.confidence.toFixed(1)}`, {
        stage: 'ocr_complete',
        confidence: ocrResult.confidence
      });

      return {
        content: ocrResult.text,
        metadata: {
          filename,
          fileType: 'pdf',
        },
        ocrApplied: true,
        ocrConfidence: Math.round(ocrResult.confidence * 10) / 10,
        ocrPageCount: imageBuffers.length,
      };
    } catch (err) {
      console.error(`[PDF] OCR failed for ${filename}:`, err);
      return {
        content: '',
        metadata: { filename, fileType: 'pdf' },
      };
    }
  }

  supports(fileType: SupportedFileType): boolean {
    return fileType === 'pdf';
  }
}
