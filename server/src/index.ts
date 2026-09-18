import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server } from 'colyseus';
import { GameRoom } from './rooms/GameRoom';
import { prisma } from '@storm-arena/database';
import { config } from './config';
import { authRouter } from './api/AuthRouter';
import { profileRouter } from './api/ProfileRouter';
import { matchRouter } from './api/MatchRouter';
import { achievementRouter } from './api/AchievementRouter';
import { gameRoomRouter } from './api/GameRoomRouter';
import { notFoundHandler, errorHandler } from './util/validation';
import { AchievementService } from './services/AchievementService';
import { logger } from './util/logger';

process.on('uncaughtException', (err) => {
  logger.error('process', 'uncaughtException', { name: err.name, message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('process', 'unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

async function databaseStatus() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    logger.error('db', 'database health check failed', { message: String(err) });
    return { ok: false, latencyMs: Date.now() - started };
  }
}

async function main() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', (req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      logger.info('http', `${req.method} ${req.originalUrl} ${res.statusCode}`, {
        durationMs: Date.now() - started,
      });
    });
    next();
  });

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
  });
  app.use('/api', globalLimiter);

  app.get('/health', async (_req, res) => {
    const db = await databaseStatus();
    res.header('Cache-Control', 'no-store');
    res.json({
      status: db.ok ? 'ok' : 'degraded',
      uptime: process.uptime(),
      database: db,
    });
  });

  app.post('/api/log/client-error', globalLimiter, (req, res) => {
    const body = (req.body ?? {}) as { message?: unknown; code?: unknown; location?: unknown };
    if (!body.message || typeof body.message !== 'string' || body.message.length === 0) {
      return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'message is required.' } });
    }
    logger.warn('client', String(body.message).slice(0, 1000), {
      code: typeof body.code === 'string' ? body.code : undefined,
      location: typeof body.location === 'string' ? body.location.slice(0, 500) : undefined,
    });
    return res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', gameRoomRouter);
  app.use('/api', profileRouter);
  app.use('/api', matchRouter);
  app.use('/api', achievementRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const httpServer = http.createServer(app);

  const dbBoot = await databaseStatus();
  logger[dbBoot.ok ? 'info' : 'error']('startup', dbBoot.ok ? 'Database connection established.' : 'Database connection FAILED.', dbBoot);

  if (dbBoot.ok) {
    try {
      const achievements = new AchievementService();
      await achievements.ensureDefinitions();
      logger.info('startup', 'Achievements ensured.');
    } catch (err) {
      logger.warn('startup', 'Failed to ensure achievement definitions', { message: String(err) });
    }
  } else {
    logger.warn('startup', 'Database offline; achievement initialization deferred.');
  }

  const gameServer = new Server({ server: httpServer });

  gameServer.define('game_room', GameRoom);

  const runningServer = httpServer.listen(config.port, () => {
    logger.info('startup', `Storm Arena server listening on http://localhost:${config.port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info('shutdown', `${signal} received. Shutting down gracefully...`);
    runningServer.close(() => {
      logger.info('shutdown', 'HTTP server closed.');
      prisma.$disconnect().then(() => {
        logger.info('shutdown', 'Database disconnected.');
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.error('shutdown', 'Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('startup', 'Server failed to start', {
    name: err instanceof Error ? err.name : undefined,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});