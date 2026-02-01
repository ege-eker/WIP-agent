import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

export function inputSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitizeObject(val as Record<string, unknown>);
    }
  }
}
