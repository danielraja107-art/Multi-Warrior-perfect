import { Room } from 'colyseus';
import { GameState, Enemy, EnemyType, EnemyState, Difficulty, Player } from '@storm-arena/shared';
import { getEnemyStats, getScaledHealth, getScaledDamage } from '@storm-arena/shared';
import { createEnemyConfig, scaleEnemyForWave, getDifficultyMultiplier } from './EnemyTypes';
import { EnemyAI, EnemyAIState, AIContext, createEnemyAIState } from './EnemyAI';
import { MOVEMENT_BOUNDARY } from '../movement/MovementSystem';

export interface EnemyInstance {
  schema: Enemy;
  ai: EnemyAI;
  aiState: EnemyAIState;
  wave: number;
}

interface EnemyProjectile {
  id: string;
  enemyId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  spawnTime: number;
  damage: number;
}

const ENEMY_SPAWN_RADIUS = 15;
const TICK_INTERVAL_MS = 50;
const STAGGER_DURATION = 500;
const KNOCKBACK_DURATION = 300;
const RECOVER_DURATION = 800;
const RANGED_PROJECTILE_SPEED = 12;
const RANGED_PROJECTILE_LIFETIME = 3000;

function aiStateToEnemyState(aiState: string): EnemyState {
  switch (aiState) {
    case 'IDLE': return EnemyState.IDLE;
    case 'DETECT': return EnemyState.DETECT;
    case 'CHASE': return EnemyState.CHASE;
    case 'ATTACK': return EnemyState.ATTACK;
    case 'RECOVER': return EnemyState.RECOVER;
    case 'STAGGER': return EnemyState.STAGGER;
    case 'KNOCKBACK': return EnemyState.KNOCKBACK;
    case 'DEAD': return EnemyState.DEAD;
    default: return EnemyState.IDLE;
  }
}

function enemyStateToString(enemyState: EnemyState): string {
  return enemyState;
}

export class EnemySystem {
  private room: Room<GameState>;
  private enemies: Map<string, EnemyInstance> = new Map();
  private projectiles: Map<string, EnemyProjectile> = new Map();
  private currentWave = 0;
  private difficulty = 'normal';
  private onEnemyDeathCallback: (() => void) | null = null;

  constructor(room: Room<GameState>) {
    this.room = room;
  }

  setOnEnemyDeathCallback(callback: () => void): void {
    this.onEnemyDeathCallback = callback;
  }

  setWave(wave: number, difficulty?: string): void {
    this.currentWave = wave;
    if (difficulty) this.difficulty = difficulty;
  }

  startWave(wave: number, difficulty: string): void {
    this.currentWave = wave;
    this.difficulty = difficulty;
    this.clearAll();

    const enemyCount = this.calculateEnemyCount(wave, difficulty);
    const types = this.selectEnemyTypes(wave);

    for (let i = 0; i < enemyCount; i++) {
      const type = types[i % types.length];
      this.spawnEnemy(type);
    }

    this.room.state.currentWave = wave;
    this.room.state.enemiesRemaining = enemyCount;
  }

  private calculateEnemyCount(wave: number, difficulty: string): number {
    const baseCount = 3 + Math.floor(wave * 1.5);
    const diffMult = getDifficultyMultiplier(difficulty);
    return Math.round(baseCount * diffMult);
  }

  private selectEnemyTypes(wave: number): EnemyType[] {
    const pool: EnemyType[] = [EnemyType.BASIC];
    if (wave >= 2) pool.push(EnemyType.FAST);
    if (wave >= 3) pool.push(EnemyType.HEAVY);
    if (wave >= 4) pool.push(EnemyType.SHIELD);
    if (wave >= 5) pool.push(EnemyType.RANGED);
    if (wave >= 6) pool.push(EnemyType.ELITE);
    return pool;
  }

  spawnEnemy(type: EnemyType, position?: { x: number; y: number; z: number }): EnemyInstance {
    const baseStats = getEnemyStats(type);
    const diffMult = getDifficultyMultiplier(this.difficulty);

    const maxHealth = getScaledHealth(baseStats.health, this.currentWave, diffMult);
    const damage = getScaledDamage(baseStats.damage, this.currentWave, diffMult);

    const pos = position ?? this.getRandomSpawnPosition();

    const enemySchema = new Enemy();
    enemySchema.id = `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    enemySchema.type = type;
    enemySchema.health = maxHealth;
    enemySchema.maxHealth = maxHealth;
    enemySchema.state = EnemyState.IDLE;
    enemySchema.position.x = pos.x;
    enemySchema.position.y = pos.y;
    enemySchema.position.z = pos.z;
    enemySchema.targetPlayerId = '';

    const aiState = createEnemyAIState(
      enemySchema.id,
      type,
      { x: pos.x, y: pos.y, z: pos.z },
      {
        maxHealth,
        speed: baseStats.speed,
        attackRange: baseStats.attackRange,
        detectionRange: baseStats.detectionRange,
        attackCooldown: baseStats.attackCooldown,
        knockbackResistance: baseStats.knockbackResistance,
        damage,
      },
      // Brief initial attack delay so enemies don't hit immediately on arrival
      this.room.state.elapsedTime + 500
    );

    const ai = new EnemyAI();
    const instance: EnemyInstance = {
      schema: enemySchema,
      ai,
      aiState,
      wave: this.currentWave,
    };

    this.enemies.set(enemySchema.id, instance);
    this.room.state.enemies.set(enemySchema.id, enemySchema);

    return instance;
  }

  private getRandomSpawnPosition(): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    // Spawn between 10.5 and 15 units out so players have room to react
    const radius = 10.5 + Math.random() * (ENEMY_SPAWN_RADIUS - 10.5);
    return {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
    };
  }

  update(deltaTime: number): void {
    const currentTime = this.room.state.elapsedTime;
    const players = this.room.state.players;

    this.enemies.forEach((instance, id) => {
      if (instance.schema.health <= 0) {
        this.removeEnemy(id);
        return;
      }

      const targetId = this.selectTarget(instance, players);
      instance.schema.targetPlayerId = targetId;
      instance.aiState.targetPlayerId = targetId;

      const ctx: AIContext = {
        enemy: instance.aiState,
        players: this.getPlayerPositions(players),
        currentTime,
        tick: Math.floor(currentTime / TICK_INTERVAL_MS),
      };

      instance.ai.update(ctx);

      const aiState = instance.ai.getState();
      instance.schema.state = aiStateToEnemyState(aiState);

      if (aiState === 'CHASE' && targetId) {
        this.moveTowardsTarget(instance, targetId, deltaTime);
      } else if (instance.ai.getState() === 'ATTACK' && targetId) {
        this.attackTarget(instance, targetId, currentTime);
      }

      this.syncAIStateToSchema(instance);
    });
  }

  private selectTarget(instance: EnemyInstance, players: Map<string, Player>): string {
    // Distribute enemies across living players rather than all 5 swarming one player
    const targetCounts = new Map<string, number>();
    this.enemies.forEach((other) => {
      if (other.schema.id !== instance.schema.id && other.schema.targetPlayerId) {
        targetCounts.set(other.schema.targetPlayerId, (targetCounts.get(other.schema.targetPlayerId) ?? 0) + 1);
      }
    });

    let bestId = '';
    let bestScore = Infinity;

    players.forEach((player, id) => {
      if (!player.isAlive) return;
      const pid = player.id || player.sessionId || id;
      const dx = player.position.x - instance.schema.position.x;
      const dz = player.position.z - instance.schema.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= instance.aiState.detectionRange) {
        const count = targetCounts.get(pid) ?? 0;
        // Balance distance with current target load
        const score = dist + count * 4.0;
        if (score < bestScore) {
          bestScore = score;
          bestId = pid;
        }
      }
    });

    return bestId;
  }

  private getPlayerPositions(players: Map<string, Player>): Map<string, { position: { x: number; y: number; z: number }; health: number }> {
    const result = new Map();
    players.forEach((p, id) => {
      if (p.isAlive) {
        result.set(id, {
          position: { x: p.position.x, y: p.position.y, z: p.position.z },
          health: p.health,
        });
      }
    });
    return result;
  }

  private moveTowardsTarget(instance: EnemyInstance, targetId: string, deltaTime: number): void {
    const target = this.room.state.players.get(targetId);
    if (!target) return;

    const dt = deltaTime / 1000;
    const dx = target.position.x - instance.schema.position.x;
    const dz = target.position.z - instance.schema.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      const speed = instance.aiState.speed;
      instance.schema.position.x += (dx / dist) * speed * dt;
      instance.schema.position.z += (dz / dist) * speed * dt;

      const yaw = Math.atan2(dx, dz);
      instance.schema.rotation.x = 0;
      instance.schema.rotation.y = yaw;
      instance.schema.rotation.z = 0;

      instance.schema.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, instance.schema.position.x));
      instance.schema.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, instance.schema.position.z));
    }
  }

  private attackTarget(instance: EnemyInstance, targetId: string, currentTime: number): void {
    const target = this.room.state.players.get(targetId);
    if (!target || !target.isAlive) return;

    if (currentTime - instance.aiState.lastAttackTime >= instance.aiState.attackCooldown) {
      instance.aiState.lastAttackTime = currentTime;
      const damage = instance.aiState.damage;

      if (instance.schema.type === EnemyType.RANGED) {
        this.fireRangedProjectile(instance, target, damage);
      } else {
        target.health = Math.max(0, target.health - damage);
        if (target.health <= 0) {
          (this.room as unknown as { handlePlayerDeath?: (id: string, killer?: string) => void }).handlePlayerDeath?.(targetId, 'enemy');
        }

        this.room.broadcast('GAME_EVENT', {
          event: 'player_killed',
          data: { sessionId: targetId, damage, health: target.health },
        });
      }
    }
  }

  private fireRangedProjectile(instance: EnemyInstance, target: Player, damage: number): void {
    const dx = target.position.x - instance.schema.position.x;
    const dz = target.position.z - instance.schema.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;

    const velocity = {
      x: (dx / dist) * RANGED_PROJECTILE_SPEED,
      y: 2,
      z: (dz / dist) * RANGED_PROJECTILE_SPEED,
    };

    const projectile: EnemyProjectile = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enemyId: instance.schema.id,
      position: { x: instance.schema.position.x, y: 1.5, z: instance.schema.position.z },
      velocity,
      spawnTime: Date.now(),
      damage,
    };

    this.projectiles.set(projectile.id, projectile);
  }

  updateProjectiles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const now = Date.now();

    this.projectiles.forEach((proj, id) => {
      if (now - proj.spawnTime > RANGED_PROJECTILE_LIFETIME) {
        this.projectiles.delete(id);
        return;
      }

      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.position.z += proj.velocity.z * dt;

      this.room.state.players.forEach((player, playerId) => {
        if (!player.isAlive) return;
        const pdx = player.position.x - proj.position.x;
        const pdz = player.position.z - proj.position.z;
        const dist = Math.sqrt(pdx * pdx + pdz * pdz);

        if (dist <= 1.5) {
          player.health = Math.max(0, player.health - proj.damage);
          if (player.health <= 0) {
            (this.room as unknown as { handlePlayerDeath?: (id: string, killer?: string) => void }).handlePlayerDeath?.(playerId, proj.enemyId);
          }
          this.room.broadcast('GAME_EVENT', {
            event: 'player_killed',
            data: { sessionId: playerId, damage: proj.damage, health: player.health },
          });
          this.projectiles.delete(id);
        }
      });

      if (proj.position.y < 0) {
        this.projectiles.delete(id);
      }
    });
  }

  private syncAIStateToSchema(instance: EnemyInstance): void {
    instance.aiState.position = { ...instance.schema.position };
    instance.aiState.rotation = { ...instance.schema.rotation };
    instance.aiState.health = instance.schema.health;
    instance.aiState.state = instance.schema.state as EnemyState;
    instance.aiState.targetPlayerId = instance.schema.targetPlayerId;
  }

  applyDamage(enemyId: string, damage: number, attackerPos: { x: number; y: number; z: number }, isHeavy: boolean): boolean {
    const instance = this.enemies.get(enemyId);
    if (!instance || instance.schema.health <= 0) return false;

    instance.schema.health = Math.max(0, instance.schema.health - damage);

    if (instance.schema.health <= 0) {
      instance.schema.state = EnemyState.DEAD;
      this.removeEnemy(enemyId);
      return true;
    }

    instance.aiState.health = instance.schema.health;

    if (isHeavy) {
      const kbDirection = this.calculateKnockbackDirection(instance.schema.position, attackerPos);
      this.applyKnockback(instance, kbDirection);
    } else {
      instance.ai.applyStagger(STAGGER_DURATION, this.room.state.elapsedTime);
      instance.schema.state = EnemyState.STAGGER;
      instance.aiState.state = EnemyState.STAGGER;
    }

    return false;
  }

  private calculateKnockbackDirection(targetPos: { x: number; y: number; z: number }, attackerPos: { x: number; y: number; z: number }): { x: number; z: number } {
    const dx = targetPos.x - attackerPos.x;
    const dz = targetPos.z - attackerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    return { x: dx / dist, z: dz / dist };
  }

  applyKnockback(instance: EnemyInstance, direction: { x: number; z: number }): void {
    const resistance = instance.aiState.knockbackResistance;
    const force = 5 * (1 / resistance);

    instance.schema.position.x += direction.x * force;
    instance.schema.position.z += direction.z * force;

    instance.schema.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, instance.schema.position.x));
    instance.schema.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, instance.schema.position.z));

    instance.ai.applyKnockback(KNOCKBACK_DURATION, this.room.state.elapsedTime);
  }

  removeEnemy(enemyId: string): void {
    const instance = this.enemies.get(enemyId);
    if (instance) {
      this.enemies.delete(enemyId);
      this.room.state.enemies.delete(enemyId);
      this.room.state.enemiesRemaining = Math.max(0, this.room.state.enemiesRemaining - 1);
      this.onEnemyDeathCallback?.();
    }
  }

  clearAll(): void {
    this.room.state.enemies.clear();
    this.enemies.clear();
    this.room.state.enemiesRemaining = 0;
  }

  getEnemies(): ReadonlyMap<string, EnemyInstance> {
    return this.enemies;
  }

  isWaveComplete(): boolean {
    return this.enemies.size === 0 && this.currentWave > 0;
  }

  getInstance(enemyId: string): EnemyInstance | undefined {
    return this.enemies.get(enemyId);
  }

  applyStagger(enemyId: string, durationMs = STAGGER_DURATION): void {
    const instance = this.enemies.get(enemyId);
    if (instance) {
      instance.ai.applyStagger(durationMs, this.room.state.elapsedTime);
      instance.schema.state = EnemyState.STAGGER;
      instance.aiState.state = EnemyState.STAGGER;
    }
  }

  applyKnockbackToEnemy(enemyId: string, newPos: { x: number; y?: number; z: number }, durationMs = KNOCKBACK_DURATION): void {
    const instance = this.enemies.get(enemyId);
    if (instance) {
      instance.schema.position.x = newPos.x;
      if (newPos.y !== undefined) instance.schema.position.y = newPos.y;
      instance.schema.position.z = newPos.z;
      instance.aiState.position.x = newPos.x;
      instance.aiState.position.z = newPos.z;
      instance.ai.applyKnockback(durationMs, this.room.state.elapsedTime);
    }
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  setDifficulty(difficulty: string): void {
    this.difficulty = difficulty;
  }
}