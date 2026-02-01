import rateLimit from 'express-rate-limit';

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many chat requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const ingestionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  message: { error: 'Too many ingestion requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
