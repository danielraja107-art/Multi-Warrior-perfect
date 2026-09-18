import { RequestHandler } from 'express';
import { ApiError } from '../util/ApiError';
import { verifyToken, TokenPayload } from './jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized());
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(ApiError.unauthorized('INVALID_TOKEN', 'Token is invalid or expired.'));
  }
};

export const requireUser = (req: { user?: TokenPayload }): TokenPayload => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  return req.user;
};
