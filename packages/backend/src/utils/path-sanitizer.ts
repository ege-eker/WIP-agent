import path from 'path';
import { PathTraversalError } from '../core/errors/validation.errors';

export function sanitizePath(inputPath: string, basePath: string): string {
  if (inputPath.includes('\0')) {
    throw new PathTraversalError();
  }

  const resolved = path.resolve(basePath, inputPath);

  if (!resolved.startsWith(path.resolve(basePath))) {
    throw new PathTraversalError();
  }

  return resolved;
}

export function isWithinBase(inputPath: string, basePath: string): boolean {
  try {
    sanitizePath(inputPath, basePath);
    return true;
  } catch {
    return false;
  }
}
