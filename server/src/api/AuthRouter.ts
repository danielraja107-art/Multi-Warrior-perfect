import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../auth/AuthService';
import { parseBody, requireString } from '../util/validation';

const authService = new AuthService();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' },
  },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = parseBody(req);
    const result = await authService.register({
      email: requireString(body.email, 'email'),
      username: requireString(body.username, 'username'),
      password: requireString(body.password, 'password'),
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = parseBody(req);
    const result = await authService.login(
      requireString(body.identifier, 'identifier'),
      requireString(body.password, 'password'),
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
