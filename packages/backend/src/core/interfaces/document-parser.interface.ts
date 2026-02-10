import { ParsedDocument, SupportedFileType } from '../types/document.types';

export type ParserProgressCallback = (message: string, details?: Record<string, any>) => void;

export interface IDocumentParser {
  parse(buffer: Buffer, filename: string, onProgress?: ParserProgressCallback): Promise<ParsedDocument>;
  supports(fileType: SupportedFileType): boolean;
}
