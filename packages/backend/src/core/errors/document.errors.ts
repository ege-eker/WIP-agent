import { AppError } from './base.error';

export class DocumentNotFoundError extends AppError {
  constructor(path: string) {
    super(`Document not found: ${path}`, 404);
  }
}

export class DocumentParseError extends AppError {
  constructor(filename: string, reason: string) {
    super(`Failed to parse document "${filename}": ${reason}`, 422);
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(fileType: string) {
    super(`Unsupported file type: ${fileType}`, 400);
  }
}
