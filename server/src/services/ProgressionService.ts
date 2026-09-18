export const XP_FORMULA = {
  kills: 10,
  damagePer10: 1,
  wavesCleared: 50,
  bossDefeated: 200,
} as const;

export function xpToNext(level: number): number {
  return 100 * level;
}

export function calculateXp(input: {
  kills: number;
  damage: number;
  wavesCleared: number;
  bossDefeated: boolean;
}): number {
  return (
    input.kills * XP_FORMULA.kills +
    Math.floor(input.damage / 10) * XP_FORMULA.damagePer10 +
    input.wavesCleared * XP_FORMULA.wavesCleared +
    (input.bossDefeated ? XP_FORMULA.bossDefeated : 0)
  );
}

export function applyXp(
  level: number,
  xp: number,
  earned: number,
): { level: number; xp: number; leveledUp: boolean } {
  let nextLevel = level;
  let nextXp = xp + earned;
  let leveledUp = false;

  while (nextXp >= xpToNext(nextLevel)) {
    nextXp -= xpToNext(nextLevel);
    nextLevel += 1;
    leveledUp = true;
  }

  return { level: nextLevel, xp: nextXp, leveledUp };
}
