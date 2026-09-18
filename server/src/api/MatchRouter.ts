import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireUser } from '../auth/middleware';
import { MatchService } from '../services/MatchService';
import { parseBody, requireNumber, requireString, isRoomCode } from '../util/validation';
import { ApiError } from '../util/ApiError';
import { config } from '../config';

const matchService = new MatchService();

export const matchRouter = Router();

matchRouter.get('/matches/:id', authenticate, async (req, res, next) => {
  try {
    requireUser(req);
    const match = await matchService.getMatch(req.params.id);
    if (!match) {
      throw ApiError.notFound('MATCH_NOT_FOUND', 'Match could not be found.');
    }
    res.json({ match });
  } catch (err) {
    next(err);
  }
});

/**
 * Authoritative match persistence endpoint.
 * Disabled in production — browsers must never submit match results.
 * Exposed only when NODE_ENV !== 'production' so integration tests can
 * exercise the full persistence/XP/achievement pipeline.
 */
matchRouter.post(
  '/matches',
  authenticate,
  rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }),
  async (req, res, next) => {
    try {
      if (config.nodeEnv === 'production') {
        throw ApiError.forbidden(
          'MATCH_SUBMISSION_DISABLED',
          'Match results must be saved by the game server.',
        );
      }

      requireUser(req);
      const body = parseBody(req);

      const participants = Array.isArray(body.participants) ? body.participants : [];
      if (participants.length === 0) {
        throw ApiError.badRequest('EMPTY_PARTICIPANTS', 'At least one participant is required.');
      }

      const roomCode = requireString(body.roomCode, 'roomCode');
      if (!isRoomCode(roomCode)) {
        throw ApiError.badRequest('INVALID_ROOM_CODE', 'Room code must be 4-8 letters/digits.');
      }

      const result = await matchService.persistMatch({
        sessionId:
          typeof body.sessionId === 'string' && body.sessionId.length > 0
            ? body.sessionId
            : undefined,
        roomCode,
        arena: typeof body.arena === 'string' && body.arena.length > 0 ? body.arena : 'storm_arena',
        difficulty: requireString(body.difficulty, 'difficulty'),
        wavesCleared: requireNumber(body.wavesCleared, 'wavesCleared'),
        bossDefeated: Boolean(body.bossDefeated),
        duration: requireNumber(body.duration, 'duration'),
        victory: Boolean(body.victory),
        participants: participants.map((p) => {
          const participant = p as Record<string, unknown>;
          return {
            userId: requireString(participant.userId, 'participant.userId'),
            color: typeof participant.color === 'string' ? participant.color : 'orange',
            kills: typeof participant.kills === 'number' ? participant.kills : 0,
            damage: typeof participant.damage === 'number' ? participant.damage : 0,
            deaths: typeof participant.deaths === 'number' ? participant.deaths : 0,
          };
        }),
      });

      res.status(result.duplicate ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
