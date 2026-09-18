import { prisma } from '@storm-arena/database';
import { calculateXp, applyXp } from './ProgressionService';
import { AchievementService, AchievementContext } from './AchievementService';

const COINS_PER_WIN = 100;
const COINS_PER_LOSS = 25;

export interface PersistParticipantInput {
  userId: string;
  color: string;
  kills: number;
  damage: number;
  deaths: number;
}

export interface PersistMatchInput {
  sessionId?: string;
  roomCode: string;
  arena: string;
  difficulty: string;
  wavesCleared: number;
  bossDefeated: boolean;
  duration: number;
  victory: boolean;
  participants: PersistParticipantInput[];
}

export class MatchService {
  private readonly achievements = new AchievementService();

  /**
   * Authoritative match persistence. Never trust the browser:
   * this must be called from the server room lifecycle.
   */
  async persistMatch(input: PersistMatchInput): Promise<{ matchId: string; duplicate: boolean }> {
    if (input.sessionId) {
      const existing = await prisma.match.findUnique({ where: { sessionId: input.sessionId } });
      if (existing) {
        return { matchId: existing.id, duplicate: true };
      }
    }

    return prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          sessionId: input.sessionId || null,
          roomCode: input.roomCode,
          arena: input.arena,
          difficulty: input.difficulty,
          wavesCleared: input.wavesCleared,
          bossDefeated: input.bossDefeated,
          duration: input.duration,
          victory: input.victory,
        },
      });

      const participants = await Promise.all(
        input.participants.map((p) =>
          tx.matchParticipant.create({
            data: {
              matchId: match.id,
              userId: p.userId,
              color: p.color,
              kills: p.kills,
              damage: p.damage,
              deaths: p.deaths,
              xpEarned: calculateXp({
                kills: p.kills,
                damage: p.damage,
                wavesCleared: input.wavesCleared,
                bossDefeated: input.bossDefeated,
              }),
            },
          }),
        ),
      );

      for (let i = 0; i < input.participants.length; i++) {
        const p = input.participants[i];
        const xpEarned = participants[i].xpEarned;
        const profile = await tx.profile.findUniqueOrThrow({ where: { userId: p.userId } });
        const leveled = applyXp(profile.level, profile.xp, xpEarned);
        const coinsEarned = input.victory ? COINS_PER_WIN : COINS_PER_LOSS;

        await tx.profile.update({
          where: { id: profile.id },
          data: {
            level: leveled.level,
            xp: leveled.xp,
            coins: { increment: coinsEarned },
            wins: { increment: input.victory ? 1 : 0 },
            losses: { increment: input.victory ? 0 : 1 },
            totalKills: { increment: p.kills },
            totalDamage: { increment: p.damage },
          },
        });

        const ctx: AchievementContext = {
          victory: input.victory,
          bossDefeated: input.bossDefeated,
          wavesCleared: input.wavesCleared,
          killsThisMatch: p.kills,
          totalKillsAfter: profile.totalKills + p.kills,
          partySize: input.participants.length,
        };
        await this.achievements.checkAndUnlock(p.userId, ctx);
      }

      return { matchId: match.id, duplicate: false };
    });
  }

  async getMatch(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { xpEarned: 'desc' },
        },
      },
    });
    return match;
  }

  async listMatches(userId: string, take = 20, skip = 0) {
    return prisma.match.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { xpEarned: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }
}
