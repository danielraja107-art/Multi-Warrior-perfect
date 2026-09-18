import { EnemyState, WeaponType, AttackType, GameEvent, Vec3 } from '@storm-arena/shared';
import { calculateDamage } from '@storm-arena/shared';

export interface DamageResult {
  enemyId: string;
  damageDealt: number;
  newHealth: number;
  killed: boolean;
  stateChange: string | null;
}

export class DamageSystem {
  applyDamage(
    enemy: { health: number; maxHealth: number; state: string; id: string },
    weaponType: WeaponType,
    attackType: AttackType
  ): DamageResult {
    const baseDamage = calculateDamage(weaponType, attackType);
    const newHealth = Math.max(0, enemy.health - baseDamage);
    const killed = newHealth === 0;
    let stateChange: string | null = null;

    if (killed) {
      stateChange = EnemyState.DEAD;
    } else if (enemy.state !== EnemyState.STAGGER) {
      stateChange = EnemyState.STAGGER;
    }

    return {
      enemyId: enemy.id,
      damageDealt: baseDamage,
      newHealth,
      killed,
      stateChange,
    };
  }

  applyPlayerDamage(
    player: { health: number; maxHealth: number; isBlocking: boolean; state: string; id: string },
    damage: number
  ): { newHealth: number; killed: boolean; stateChange: string | null } {
    let finalDamage = damage;
    if (player.isBlocking && player.state === 'blocking') {
      finalDamage = Math.floor(damage * 0.5);
    }
    const newHealth = Math.max(0, player.health - finalDamage);
    const killed = newHealth === 0;
    let stateChange: string | null = null;
    if (killed) {
      stateChange = 'dead';
    }
    return { newHealth, killed, stateChange };
  }
}

export function createGameEvent(
  event: GameEvent,
  data: Record<string, unknown>
): { event: string; data: Record<string, unknown> } {
  return { event, data };
}