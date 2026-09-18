import { Request, Response, NextFunction } from 'express';
import { ApiError } from './ApiError';
import { config } from '../config';
import { logger } from './logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function isUsername(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 24 &&
    /^[a-zA-Z0-9_]+$/.test(value)
  );
}

export function isPassword(value: string): boolean {
  return typeof value === 'string' && value.length >= 6 && value.length <= 72;
}

export function isRoomCode(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length >= 4 &&
    value.length <= 8 &&
    /^[A-Za-z0-9]+$/.test(value)
  );
}

export interface Validator {
  field: string;
  valid: boolean;
  message?: string;
}

export function parseBody(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object') {
    throw ApiError.badRequest('INVALID_BODY', 'Request body must be an object.');
  }
  return req.body as Record<string, unknown>;
}

export function requireString(value: unknown, field: string, message?: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ApiError.badRequest('MISSING_FIELD', message ?? `Field "${field}" is required.`);
  }
  return value.trim();
}

export function requireNumber(value: unknown, field: string, message?: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw ApiError.badRequest('INVALID_FIELD', message ?? `Field "${field}" must be a number.`);
  }
  return value;
}

export function notFoundHandler(_req: Request, _res: Response, _next: NextFunction): void {
  throw ApiError.notFound('ROUTE_NOT_FOUND', 'Route not found.');
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof Error && err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as { code?: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      const target = prismaErr.meta?.target?.join(', ') ?? 'record';
      res
        .status(409)
        .json({
          error: { code: 'DUPLICATE', message: `A record with this ${target} already exists.` },
        });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } });
      return;
    }
  }

  logger.error('validation', 'unhandled error', { error: err instanceof Error ? err.message : String(err) });
  const message =
    config.nodeEnv === 'production'
      ? 'Internal server error.'
      : err instanceof Error
        ? err.message
        : String(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}
