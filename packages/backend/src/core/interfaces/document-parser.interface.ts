import { ParsedDocument, SupportedFileType } from '../types/document.types';

export interface IDocumentParser {
  parse(buffer: Buffer, filename: string): Promise<ParsedDocument>;
  supports(fileType: SupportedFileType): boolean;
}
