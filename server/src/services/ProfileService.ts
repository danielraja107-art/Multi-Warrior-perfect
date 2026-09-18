import { prisma } from '@storm-arena/database';

export class ProfileService {
  async getOwn(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
      },
    });
  }

  async getStats(userId: string) {
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { userId },
      include: { user: { select: { username: true, email: true } } },
    });

    const matches = await prisma.matchParticipant.groupBy({
      by: ['matchId'],
      where: { userId },
      _count: { matchId: true },
    });

    const xpHistory = await prisma.matchParticipant.findMany({
      where: { userId },
      select: { xpEarned: true },
      orderBy: { id: 'asc' },
    });

    return {
      username: profile.user.username,
      email: profile.user.email,
      level: profile.level,
      xp: profile.xp,
      coins: profile.coins,
      wins: profile.wins,
      losses: profile.losses,
      totalKills: profile.totalKills,
      totalDamage: profile.totalDamage,
      matchesPlayed: matches.length,
      xpHistory: xpHistory.map((h) => h.xpEarned),
    };
  }

  async updateAvatar(userId: string, avatar: string): Promise<{ avatar: string | null }> {
    const profile = await prisma.profile.update({
      where: { userId },
      data: { avatar },
      select: { avatar: true },
    });
    return profile;
  }
}
