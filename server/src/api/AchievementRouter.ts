import { Router } from 'express';
import { authenticate, requireUser } from '../auth/middleware';
import { prisma } from '@storm-arena/database';

export const achievementRouter = Router();

achievementRouter.get('/achievements', authenticate, async (req, res, next) => {
  try {
    const user = requireUser(req);

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: user.userId },
      select: { achievementId: true, unlockedAt: true },
    });
    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

    const defs = await prisma.achievement.findMany({ orderBy: { code: 'asc' } });

    res.json({
      achievements: defs.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});
