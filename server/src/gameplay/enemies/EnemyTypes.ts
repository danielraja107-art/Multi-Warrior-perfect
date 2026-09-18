import { EnemyType } from '@storm-arena/shared';
import { getEnemyStats, EnemyStats } from '@storm-arena/shared';

export interface EnemyConfig extends EnemyStats {
  maxHealth: number;
}

export function createEnemyConfig(type: EnemyType, wave: number = 1, difficultyMultiplier: number = 1.0): EnemyConfig {
  const base = getEnemyStats(type);
  return {
    ...base,
    health: base.health,
    maxHealth: base.health,
  };
}

export function scaleEnemyForWave(config: EnemyConfig, wave: number, difficultyMultiplier: number = 1.0): EnemyConfig {
  return {
    ...config,
    maxHealth: Math.round(config.maxHealth * (1 + (wave - 1) * 0.15) * difficultyMultiplier),
    damage: Math.round(config.damage * (1 + (wave - 1) * 0.1) * difficultyMultiplier),
  };
}

export function getDifficultyMultiplier(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 0.8;
    case 'normal': return 1.0;
    case 'hard': return 1.3;
    default: return 1.0;
  }
}