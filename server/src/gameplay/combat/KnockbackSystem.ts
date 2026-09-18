import { WeaponType, AttackType, Vec3 } from '@storm-arena/shared';
import { calculateKnockback } from '@storm-arena/shared';
import { MOVEMENT_BOUNDARY } from '../movement/MovementSystem';

export interface KnockbackResult {
  position: Vec3;
  velocity: Vec3;
}

export class KnockbackSystem {
  applyKnockback(
    targetPos: Vec3,
    attackerPos: Vec3,
    weaponType: WeaponType,
    attackType: AttackType,
    targetIsEnemy: boolean = true
  ): KnockbackResult {
    const knockbackForce = calculateKnockback(weaponType, attackType);

    const dirX = targetPos.x - attackerPos.x;
    const dirZ = targetPos.z - attackerPos.z;
    const dist = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

    const forceX = (dirX / dist) * knockbackForce;
    const forceZ = (dirZ / dist) * knockbackForce;

    let newX = targetPos.x + forceX;
    let newZ = targetPos.z + forceZ;

    newX = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, newX));
    newZ = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, newZ));

    return {
      position: { x: newX, y: targetPos.y, z: newZ },
      velocity: { x: forceX, y: 0, z: forceZ },
    };
  }

  applyChainKnockback(
    hitEnemyPos: Vec3,
    nearbyEnemies: Array<{ id: string; position: Vec3 }>,
    weaponType: WeaponType,
    attackType: AttackType
  ): Array<{ id: string; position: Vec3; velocity: Vec3 }> {
    const baseKnockback = calculateKnockback(weaponType, attackType);
    const chainForce = baseKnockback * 0.5;
    const results: Array<{ id: string; position: Vec3; velocity: Vec3 }> = [];

    for (const enemy of nearbyEnemies) {
      const dx = enemy.position.x - hitEnemyPos.x;
      const dz = enemy.position.z - hitEnemyPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0 && dist <= 2.5) {
        const forceX = (dx / dist) * chainForce;
        const forceZ = (dz / dist) * chainForce;

        let newX = enemy.position.x + forceX;
        let newZ = enemy.position.z + forceZ;

        newX = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, newX));
        newZ = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, newZ));

        results.push({
          id: enemy.id,
          position: { x: newX, y: enemy.position.y, z: newZ },
          velocity: { x: forceX, y: 0, z: forceZ },
        });
      }
    }

    return results;
  }
}