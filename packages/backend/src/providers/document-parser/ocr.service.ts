import Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

export class OcrService {
  private worker: Tesseract.Worker | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureWorker(): Promise<Tesseract.Worker> {
    if (this.worker) {
      return this.worker;
    }

    if (!this.initPromise) {
      this.initPromise = this.initWorker();
    }

    await this.initPromise;
    return this.worker!;
  }

  private async initWorker(): Promise<void> {
    this.worker = await Tesseract.createWorker('tur+eng', 1, {
      logger: () => {},
    });
  }

  async recognizeImage(imageBuffer: Buffer): Promise<OcrResult> {
    const worker = await this.ensureWorker();
    const result = await worker.recognize(imageBuffer);

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  }

  async recognizeImages(
    imageBuffers: Buffer[],
    onPageProgress?: (currentPage: number, totalPages: number) => void
  ): Promise<OcrResult> {
    const results: OcrResult[] = [];
    const total = imageBuffers.length;

    for (let i = 0; i < imageBuffers.length; i++) {
      onPageProgress?.(i + 1, total);
      const result = await this.recognizeImage(imageBuffers[i]);
      results.push(result);
    }

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const avgConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return {
      text: results.map((r) => r.text).join('\n'),
      confidence: avgConfidence,
    };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initPromise = null;
    }
  }
}

export const ocrService = new OcrService();
