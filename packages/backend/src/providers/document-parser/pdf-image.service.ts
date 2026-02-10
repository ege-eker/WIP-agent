import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import pdfPoppler from 'pdf-poppler';

export class PdfImageService {
  async convertToImages(pdfBuffer: Buffer, filename: string): Promise<Buffer[]> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    const pdfPath = path.join(tempDir, 'input.pdf');

    try {
      await fs.promises.writeFile(pdfPath, pdfBuffer);

      const opts: pdfPoppler.Options = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: 'page',
        page: null,
        scale: 2048,
      };

      await pdfPoppler.convert(pdfPath, opts);

      const files = await fs.promises.readdir(tempDir);
      const imageFiles = files
        .filter((f) => f.startsWith('page') && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

      const imageBuffers: Buffer[] = [];
      for (const imageFile of imageFiles) {
        const imagePath = path.join(tempDir, imageFile);
        const buffer = await fs.promises.readFile(imagePath);
        imageBuffers.push(buffer);
      }

      return imageBuffers;
    } finally {
      await this.cleanupDir(tempDir);
    }
  }

  private async cleanupDir(dir: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        await fs.promises.unlink(path.join(dir, file));
      }
      await fs.promises.rmdir(dir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export const pdfImageService = new PdfImageService();
