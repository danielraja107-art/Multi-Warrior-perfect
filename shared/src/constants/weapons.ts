import { WeaponType, AttackType } from '../types/index';

export interface WeaponProfile {
  type: WeaponType;
  name: string;
  damage: number;
  knockback: number;
  cooldown: number;
  activeFrames: number;
  hitboxType: 'sphere' | 'box';
  hitboxRadius: number;
  hitboxLength: number;
  lightMultiplier: number;
  heavyMultiplier: number;
  isProjectile: boolean;
  throwable: boolean;
}

export const WEAPONS: Record<WeaponType, WeaponProfile> = {
  [WeaponType.FIST]: {
    type: WeaponType.FIST,
    name: 'Fist',
    damage: 10,
    knockback: 5,
    cooldown: 300,
    activeFrames: 3,
    hitboxType: 'sphere',
    hitboxRadius: 1.5,
    hitboxLength: 0,
    lightMultiplier: 1.0,
    heavyMultiplier: 1.5,
    isProjectile: false,
    throwable: false,
  },
  [WeaponType.STICK]: {
    type: WeaponType.STICK,
    name: 'Stick',
    damage: 15,
    knockback: 8,
    cooldown: 400,
    activeFrames: 4,
    hitboxType: 'box',
    hitboxRadius: 2.0,
    hitboxLength: 2.5,
    lightMultiplier: 1.0,
    heavyMultiplier: 1.6,
    isProjectile: false,
    throwable: true,
  },
  [WeaponType.BASEBALL_BAT]: {
    type: WeaponType.BASEBALL_BAT,
    name: 'Baseball Bat',
    damage: 20,
    knockback: 12,
    cooldown: 500,
    activeFrames: 5,
    hitboxType: 'box',
    hitboxRadius: 2.2,
    hitboxLength: 3.0,
    lightMultiplier: 1.0,
    heavyMultiplier: 1.8,
    isProjectile: false,
    throwable: false,
  },
  [WeaponType.AXE]: {
    type: WeaponType.AXE,
    name: 'Axe',
    damage: 25,
    knockback: 10,
    cooldown: 600,
    activeFrames: 5,
    hitboxType: 'box',
    hitboxRadius: 2.0,
    hitboxLength: 2.8,
    lightMultiplier: 1.0,
    heavyMultiplier: 2.0,
    isProjectile: false,
    throwable: true,
  },
  [WeaponType.HAMMER]: {
    type: WeaponType.HAMMER,
    name: 'Hammer',
    damage: 30,
    knockback: 15,
    cooldown: 800,
    activeFrames: 6,
    hitboxType: 'sphere',
    hitboxRadius: 2.5,
    hitboxLength: 0,
    lightMultiplier: 1.0,
    heavyMultiplier: 2.2,
    isProjectile: false,
    throwable: false,
  },
  [WeaponType.ROCK]: {
    type: WeaponType.ROCK,
    name: 'Rock',
    damage: 12,
    knockback: 6,
    cooldown: 200,
    activeFrames: 2,
    hitboxType: 'sphere',
    hitboxRadius: 0.8,
    hitboxLength: 0,
    lightMultiplier: 1.0,
    heavyMultiplier: 1.0,
    isProjectile: true,
    throwable: true,
  },
};

export function getWeaponStats(type: WeaponType): WeaponProfile {
  const weapon = WEAPONS[type];
  if (!weapon) {
    throw new Error(`Unknown weapon type: ${type}`);
  }
  return weapon;
}

const POWER_DAMAGE: Record<WeaponType, number> = {
  [WeaponType.FIST]: 25,
  [WeaponType.STICK]: 32,
  [WeaponType.BASEBALL_BAT]: 35,
  [WeaponType.AXE]: 55,
  [WeaponType.HAMMER]: 45,
  [WeaponType.ROCK]: 20,
};

const POWER_KNOCKBACK: Record<WeaponType, number> = {
  [WeaponType.FIST]: 16,
  [WeaponType.STICK]: 12,
  [WeaponType.BASEBALL_BAT]: 24,
  [WeaponType.AXE]: 15,
  [WeaponType.HAMMER]: 25,
  [WeaponType.ROCK]: 10,
};

export function calculateDamage(
  weaponType: WeaponType,
  attackType: AttackType,
): number {
  if (attackType === AttackType.POWER) {
    return POWER_DAMAGE[weaponType] ?? 25;
  }
  const weapon = getWeaponStats(weaponType);
  const multiplier =
    attackType === AttackType.HEAVY ? weapon.heavyMultiplier : weapon.lightMultiplier;
  return Math.round(weapon.damage * multiplier);
}

export function calculateKnockback(
  weaponType: WeaponType,
  attackType: AttackType,
): number {
  if (attackType === AttackType.POWER) {
    return POWER_KNOCKBACK[weaponType] ?? 16;
  }
  const weapon = getWeaponStats(weaponType);
  const multiplier =
    attackType === AttackType.HEAVY ? 1.5 : 1.0;
  return Math.round(weapon.knockback * multiplier);
}