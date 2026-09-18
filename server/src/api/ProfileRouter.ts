import { Router } from 'express';
import { authenticate, requireUser } from '../auth/middleware';
import { ProfileService } from '../services/ProfileService';
import { MatchService } from '../services/MatchService';
import { ApiError } from '../util/ApiError';

const profileService = new ProfileService();
const matchService = new MatchService();

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/me', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const me = await profileService.getOwn(user.userId);
    if (!me) {
      throw ApiError.notFound('USER_NOT_FOUND', 'Account could not be found.');
    }
    res.json({
      id: me.id,
      username: me.username,
      email: me.email,
      profile: me.profile,
      achievements: me.achievements.map((a) => ({
        id: a.achievement.id,
        code: a.achievement.code,
        name: a.achievement.name,
        description: a.achievement.description,
        icon: a.achievement.icon,
        unlockedAt: a.unlockedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

profileRouter.get('/me/stats', async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.json(await profileService.getStats(user.userId));
  } catch (err) {
    next(err);
  }
});

profileRouter.patch('/me/avatar', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar : '';
    if (avatar.length > 64) {
      throw ApiError.badRequest('INVALID_AVATAR', 'Avatar must be 64 characters or fewer.');
    }
    res.json(await profileService.updateAvatar(user.userId, avatar));
  } catch (err) {
    next(err);
  }
});

profileRouter.get('/me/history', async (req, res, next) => {
  try {
    const user = requireUser(req);
    const take = Math.min(Number(req.query.take) || 20, 50);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const matches = await matchService.listMatches(user.userId, take, skip);
    res.json({ matches });
  } catch (err) {
    next(err);
  }
});
