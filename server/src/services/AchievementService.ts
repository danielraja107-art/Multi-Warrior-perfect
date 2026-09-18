import { prisma, Achievement } from '@storm-arena/database';

export const ACHIEVEMENT_DEFS = [
  {
    code: 'first_win',
    name: 'First Victory',
    description: 'Win your first match in Storm Arena.',
    icon: '🏆',
  },
  {
    code: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Defeat the Storm Guardian with your squad.',
    icon: '👹',
  },
  { code: '100_kills', name: 'Century', description: 'Reach 100 cumulative kills.', icon: '💀' },
  {
    code: 'wave_5',
    name: 'Endure the Storm',
    description: 'Clear all 5 waves in a single match.',
    icon: '🌊',
  },
  {
    code: 'team_player',
    name: 'Team Player',
    description: 'Complete a match with four players in your squad.',
    icon: '🤝',
  },
] as const;

export interface AchievementContext {
  victory: boolean;
  bossDefeated: boolean;
  wavesCleared: number;
  killsThisMatch: number;
  totalKillsAfter: number;
  partySize: number;
}

export class AchievementService {
  async ensureDefinitions(): Promise<void> {
    for (const def of ACHIEVEMENT_DEFS) {
      await prisma.achievement.upsert({
        where: { code: def.code },
        update: { name: def.name, description: def.description, icon: def.icon },
        create: { ...def },
      });
    }
  }

  private async unlockBatched(userIds: string[], defs: Achievement[]): Promise<void> {
    const existing = await prisma.userAchievement.findMany({
      where: {
        userId: { in: userIds },
        achievementId: { in: defs.map((d) => d.id) },
      },
      select: { userId: true, achievementId: true },
    });

    const owned = new Set(existing.map((e) => `${e.userId}:${e.achievementId}`));
    const toCreate = [];
    for (const userId of userIds) {
      for (const def of defs) {
        const key = `${userId}:${def.id}`;
        if (!owned.has(key)) {
          toCreate.push({ userId, achievementId: def.id });
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.userAchievement.createMany({ data: toCreate, skipDuplicates: true });
    }
  }

  async checkAndUnlock(userId: string, ctx: AchievementContext): Promise<string[]> {
    const defs = await prisma.achievement.findMany();
    const byCode = new Map(defs.map((d) => [d.code, d]));
    const unlocked: string[] = [];

    const candidates: Achievement[] = [];

    if (ctx.totalKillsAfter >= 100) {
      const def = byCode.get('100_kills');
      if (def) candidates.push(def);
    }
    if (ctx.victory) {
      const def = byCode.get('first_win');
      if (def) candidates.push(def);
    }
    if (ctx.bossDefeated && ctx.victory) {
      const def = byCode.get('boss_slayer');
      if (def) candidates.push(def);
    }
    if (ctx.wavesCleared >= 5) {
      const def = byCode.get('wave_5');
      if (def) candidates.push(def);
    }
    if (ctx.partySize >= 4) {
      const def = byCode.get('team_player');
      if (def) candidates.push(def);
    }

    if (candidates.length > 0) {
      const before = await prisma.userAchievement.count({
        where: { userId, achievementId: { in: candidates.map((c) => c.id) } },
      });
      await this.unlockBatched([userId], candidates);
      const after = await prisma.userAchievement.count({
        where: { userId, achievementId: { in: candidates.map((c) => c.id) } },
      });
      if (after > before) {
        unlocked.push(...candidates.map((c) => c.code));
      }
    }

    return unlocked;
  }
}
