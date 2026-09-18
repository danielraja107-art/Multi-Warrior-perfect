import { EnemyType, Difficulty } from '../types/index';

export interface WaveComposition {
  wave: number;
  name: string;
  enemies: Array<{ type: EnemyType; count: number }>;
  isBossWave: boolean;
}

export interface WaveBudget {
  baseBudget: number;
  budgetPerPlayer: number;
  difficultyMultiplier: Record<Difficulty, number>;
}

export const WAVE_BUDGET: WaveBudget = {
  baseBudget: 100,
  budgetPerPlayer: 25,
  difficultyMultiplier: {
    [Difficulty.EASY]: 0.7,
    [Difficulty.NORMAL]: 1.0,
    [Difficulty.HARD]: 1.4,
  },
};

export const WAVE_COST: Record<EnemyType, number> = {
  [EnemyType.BASIC]: 10,
  [EnemyType.FAST]: 12,
  [EnemyType.HEAVY]: 20,
  [EnemyType.SHIELD]: 18,
  [EnemyType.RANGED]: 15,
  [EnemyType.ELITE]: 30,
};

export const WAVES: WaveComposition[] = [
  {
    wave: 1,
    name: 'The Awakening',
    enemies: [
      { type: EnemyType.BASIC, count: 4 },
      { type: EnemyType.FAST, count: 1 },
    ],
    isBossWave: false,
  },
  {
    wave: 2,
    name: 'Growing Threat',
    enemies: [
      { type: EnemyType.BASIC, count: 4 },
      { type: EnemyType.FAST, count: 2 },
      { type: EnemyType.HEAVY, count: 1 },
    ],
    isBossWave: false,
  },
  {
    wave: 3,
    name: 'The Siege',
    enemies: [
      { type: EnemyType.BASIC, count: 3 },
      { type: EnemyType.FAST, count: 3 },
      { type: EnemyType.HEAVY, count: 2 },
      { type: EnemyType.RANGED, count: 2 },
    ],
    isBossWave: false,
  },
  {
    wave: 4,
    name: 'Elite Assault',
    enemies: [
      { type: EnemyType.ELITE, count: 2 },
      { type: EnemyType.HEAVY, count: 3 },
      { type: EnemyType.RANGED, count: 3 },
      { type: EnemyType.SHIELD, count: 2 },
    ],
    isBossWave: false,
  },
  {
    wave: 5,
    name: 'The Boss',
    enemies: [],
    isBossWave: true,
  },
];

export const BOSS_HEALTH_BASE = 500;
export const BOSS_HEALTH_PER_PLAYER = 150;
export const REST_PERIOD_MS = 10000;
export const REST_HEAL_AMOUNT = 20;
export const SPAWN_STAGGER_MS = 500;
export const SPAWN_STAGGER_WINDOW_MS = 5000;
export const MAX_WAVES = 5;

export function getWaveComposition(wave: number): WaveComposition | undefined {
  return WAVES.find((w) => w.wave === wave);
}

export function calculateEnemyBudget(
  playerCount: number,
  difficulty: Difficulty,
): number {
  const budget =
    WAVE_BUDGET.baseBudget + WAVE_BUDGET.budgetPerPlayer * (playerCount - 1);
  const multiplier = WAVE_BUDGET.difficultyMultiplier[difficulty] ?? 1.0;
  return Math.round(budget * multiplier);
}

export function getBossHealth(playerCount: number): number {
  return BOSS_HEALTH_BASE + BOSS_HEALTH_PER_PLAYER * (playerCount - 1);
}