import bcrypt from 'bcryptjs';
import { prisma, Prisma } from '@storm-arena/database';
import { signToken, TokenPayload } from './jwt';
import { ApiError } from '../util/ApiError';
import { isEmail, isPassword, isUsername } from '../util/validation';
import { logger } from '../util/logger';

const SALT_ROUNDS = 10;

export interface UserSafe {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export interface AuthResult {
  user: UserSafe;
  token: string;
}

function toSafeUser(user: {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}): UserSafe {
  return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt };
}

function toToken(user: { id: string; username: string }): TokenPayload {
  return { userId: user.id, username: user.username };
}

export class AuthService {
  async register(input: {
    email: string;
    username: string;
    password: string;
  }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    if (!isEmail(email)) {
      throw ApiError.badRequest('INVALID_EMAIL', 'Please provide a valid email address.');
    }
    if (!isUsername(username)) {
      throw ApiError.badRequest(
        'INVALID_USERNAME',
        'Username must be 3-24 characters, using letters, numbers, or underscores.',
      );
    }
    if (!isPassword(input.password)) {
      throw ApiError.badRequest('WEAK_PASSWORD', 'Password must be at least 6 characters.');
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true, email: true, username: true },
    });
    if (existing) {
      throw ApiError.conflict(
        'USER_EXISTS',
        existing.email === email
          ? 'An account with this email already exists.'
          : 'This username is already taken.',
      );
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          profile: { create: {} },
        },
      });
logger.info('auth', 'registration succeeded', { userId: user.id, username: user.username });
      return { user: toSafeUser(user), token: signToken(toToken(user)) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict(
          'USER_EXISTS',
          'An account with this email or username already exists.',
        );
      }
      throw err;
    }
  }

  async login(identifier: string, password: string): Promise<AuthResult> {
    const email = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: identifier.trim() }],
      },
    });
    if (!user) {
      logger.warn('auth', 'login failed: account not found', { identifier });
      throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email/username or password.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn('auth', 'login failed: invalid password', { identifier });
      throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email/username or password.');
    }

    logger.info('auth', 'login succeeded', { userId: user.id, username: user.username });
    return { user: toSafeUser(user), token: signToken(toToken(user)) };
  }

  async getTokenUser(userId: string): Promise<UserSafe | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? toSafeUser(user) : null;
  }
}
