import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
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
  {
    code: '100_kills',
    name: 'Century',
    description: 'Reach 100 cumulative kills.',
    icon: '💀',
  },
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

async function main() {
  console.log('Seeding database...');

  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: { name: a.name, description: a.description, icon: a.icon },
      create: a,
    });
  }

  const admin = await prisma.user.upsert({
    where: { username: 'Admin' },
    update: {},
    create: {
      username: 'Admin',
      email: 'admin@stormarena.test',
      passwordHash: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8lU2oVgb2hO7y0mW0ZZv9VqNRO7j9u',
      profile: {
        create: {},
      },
    },
  });

  await prisma.userAchievement.upsert({
    where: {
      userId_achievementId: {
        userId: admin.id,
        achievementId: (
          await prisma.achievement.findUniqueOrThrow({ where: { code: 'first_win' } })
        ).id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      achievementId: (await prisma.achievement.findUniqueOrThrow({ where: { code: 'first_win' } }))
        .id,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
