import { Room } from 'colyseus';
import { GameState, Enemy, WeaponType } from '@storm-arena/shared';
import { getWeaponStats } from '@storm-arena/shared';
import { MOVEMENT_BOUNDARY } from '../movement/MovementSystem';
import { EnemySystem } from '../enemies/EnemySystem';

export interface RockProjectile {
  id: string;
  ownerId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  spawnTime: number;
  damage: number;
  knockback: number;
}

const GRAVITY = -9.8;
const PROJECTILE_SPEED = 15;
const MAX_LIFETIME_MS = 5000;
const TICK_INTERVAL_MS = 50;

export class RockProjectileSystem {
  private room: Room<GameState>;
  private projectiles: Map<string, RockProjectile> = new Map();
  private enemySystem?: EnemySystem;

  constructor(room: Room<GameState>) {
    this.room = room;
  }

  setEnemySystem(enemySystem: EnemySystem): void {
    this.enemySystem = enemySystem;
  }

  throwRock(ownerId: string, direction: { x: number; y: number; z: number }, startPos: { x: number; y: number; z: number }): void {
    const profile = getWeaponStats(WeaponType.ROCK);
    
    const mag = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2) || 1;
    const velocity = {
      x: (direction.x / mag) * PROJECTILE_SPEED,
      y: (direction.y / mag) * PROJECTILE_SPEED + 5,
      z: (direction.z / mag) * PROJECTILE_SPEED,
    };

    const projectile: RockProjectile = {
      id: `rock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerId,
      position: { ...startPos },
      velocity,
      spawnTime: Date.now(),
      damage: profile.damage,
      knockback: profile.knockback,
    };

    this.projectiles.set(projectile.id, projectile);
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const now = Date.now();

    this.projectiles.forEach((proj, id) => {
      if (now - proj.spawnTime > MAX_LIFETIME_MS) {
        this.projectiles.delete(id);
        return;
      }

      proj.velocity.y += GRAVITY * dt;
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.position.z += proj.velocity.z * dt;

      proj.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, proj.position.x));
      proj.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, proj.position.z));

      if (proj.position.y <= 0) {
        this.checkGroundImpact(proj);
        this.projectiles.delete(id);
      }

      this.checkEnemyCollision(proj);
    });
  }

  private checkGroundImpact(proj: RockProjectile): void {
    const enemies = this.room.state.enemies;
    enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;
      const dx = enemy.position.x - proj.position.x;
      const dz = enemy.position.z - proj.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= 2.0) {
        this.applyDamage(enemy, proj);
      }
    });
  }

  private checkEnemyCollision(proj: RockProjectile): void {
    const enemies = this.room.state.enemies;
    enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;
      const dx = enemy.position.x - proj.position.x;
      const dy = enemy.position.y - proj.position.y;
      const dz = enemy.position.z - proj.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= 1.0) {
        this.applyDamage(enemy, proj);
        this.projectiles.delete(proj.id);
      }
    });
  }

  private applyDamage(enemy: Enemy, proj: RockProjectile): void {
    if (!this.enemySystem) return;

    const killed = this.enemySystem.applyDamage(
      enemy.id,
      proj.damage,
      proj.position,
      false
    );

    if (killed) {
      this.room.broadcast('GAME_EVENT', {
        event: 'player_killed',
        data: { enemyId: enemy.id, damage: proj.damage, projectile: true },
      });
    } else {
      this.room.broadcast('GAME_EVENT', {
        event: 'player_killed',
        data: { enemyId: enemy.id, damage: proj.damage, health: enemy.health },
      });
    }
  }

  getProjectiles(): ReadonlyMap<string, RockProjectile> {
    return this.projectiles;
  }

  clearAll(): void {
    this.projectiles.clear();
  }
}