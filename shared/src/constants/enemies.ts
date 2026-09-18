import { EnemyType } from '../types/index';

export interface EnemyStats {
  type: EnemyType;
  name: string;
  health: number;
  damage: number;
  speed: number;
  attackRange: number;
  detectionRange: number;
  attackCooldown: number;
  knockbackResistance: number;
}

export const ENEMIES: Record<EnemyType, EnemyStats> = {
  [EnemyType.BASIC]: {
    type: EnemyType.BASIC,
    name: 'Basic',
    health: 50,
    damage: 6,
    speed: 2.6,
    attackRange: 1.4,
    detectionRange: 14.0,
    attackCooldown: 2500,
    knockbackResistance: 1.0,
  },
  [EnemyType.FAST]: {
    type: EnemyType.FAST,
    name: 'Fast',
    health: 35,
    damage: 8,
    speed: 5.5,
    attackRange: 1.3,
    detectionRange: 14.0,
    attackCooldown: 1000,
    knockbackResistance: 0.7,
  },
  [EnemyType.HEAVY]: {
    type: EnemyType.HEAVY,
    name: 'Heavy',
    health: 120,
    damage: 18,
    speed: 2.0,
    attackRange: 2.0,
    detectionRange: 10.0,
    attackCooldown: 2000,
    knockbackResistance: 2.0,
  },
  [EnemyType.SHIELD]: {
    type: EnemyType.SHIELD,
    name: 'Shield',
    health: 80,
    damage: 12,
    speed: 2.5,
    attackRange: 1.8,
    detectionRange: 8.0,
    attackCooldown: 1800,
    knockbackResistance: 1.5,
  },
  [EnemyType.RANGED]: {
    type: EnemyType.RANGED,
    name: 'Ranged',
    health: 40,
    damage: 12,
    speed: 2.5,
    attackRange: 10.0,
    detectionRange: 16.0,
    attackCooldown: 2000,
    knockbackResistance: 0.8,
  },
  [EnemyType.ELITE]: {
    type: EnemyType.ELITE,
    name: 'Elite',
    health: 200,
    damage: 22,
    speed: 3.5,
    attackRange: 2.2,
    detectionRange: 14.0,
    attackCooldown: 1200,
    knockbackResistance: 2.5,
  },
};

export function getEnemyStats(type: EnemyType): EnemyStats {
  const stats = ENEMIES[type];
  if (!stats) {
    throw new Error(`Unknown enemy type: ${type}`);
  }
  return stats;
}

export function getScaledHealth(baseHealth: number, wave: number, difficultyMultiplier: number): number {
  const effectiveWave = Math.max(1, wave);
  const waveScaling = 1 + (effectiveWave - 1) * 0.15;
  return Math.round(baseHealth * waveScaling * difficultyMultiplier);
}

export function getScaledDamage(baseDamage: number, wave: number, difficultyMultiplier: number): number {
  const effectiveWave = Math.max(1, wave);
  const waveScaling = 1 + (effectiveWave - 1) * 0.1;
  return Math.round(baseDamage * waveScaling * difficultyMultiplier);
}