import { Room, Client } from 'colyseus';
import {
  GameState,
  Player,
  Enemy,
  PlayerState,
  WeaponType,
  AttackType,
  EnemyState,
  GameEvent,
  MESSAGE_SERVER,
} from '@storm-arena/shared';
import { PositionHistory } from '../../lag/PositionHistory';
import { HitboxSystem } from './HitboxSystem';
import { DamageSystem } from './DamageSystem';
import { KnockbackSystem } from './KnockbackSystem';
import { PLAYER_SPEED, MOVEMENT_BOUNDARY, TICK_INTERVAL_MS } from '../movement/MovementSystem';

interface PendingAttack {
  clientId: string;
  weaponType: WeaponType;
  attackType: AttackType;
  timestamp: number;
  tick: number;
}

const DODGE_COOLDOWN_MS = 1000;
const DODGE_DISTANCE = 3.0;

function getWeaponCooldown(weapon: WeaponType): number {
  const cooldowns: Record<WeaponType, number> = {
    fist: 300,
    stick: 400,
    baseball_bat: 500,
    axe: 600,
    hammer: 800,
    rock: 200,
  };
  return cooldowns[weapon] ?? 300;
}

function recordEntityPositions(history: PositionHistory, entities: Map<string, { position: { x: number; y: number; z: number } }>, prefix: string): void {
  entities.forEach((entity, id) => {
    const pos = entity.position;
    history.record(`${prefix}-${id}`, { x: pos.x, y: pos.y, z: pos.z }, Date.now());
  });
}

import { EnemySystem } from '../enemies/EnemySystem';

export class CombatManager {
  private room: Room<GameState>;
  private enemySystem?: EnemySystem;
  private positionHistory: PositionHistory;
  private hitboxSystem: HitboxSystem;
  private damageSystem: DamageSystem;
  private knockbackSystem: KnockbackSystem;

  private pendingAttacks: PendingAttack[] = [];
  private playerCooldowns: Map<string, number> = new Map();
  private playerDodgeCooldowns: Map<string, number> = new Map();
  private playerBlockStates: Map<string, boolean> = new Map();
  private stateResetTimers: Map<string, NodeJS.Timeout> = new Map();
  private currentTick = 0;

  constructor(room: Room<GameState>, enemySystem?: EnemySystem) {
    this.room = room;
    this.enemySystem = enemySystem;
    this.positionHistory = new PositionHistory();
    this.hitboxSystem = new HitboxSystem(this.positionHistory);
    this.damageSystem = new DamageSystem();
    this.knockbackSystem = new KnockbackSystem();
  }

  public setEnemySystem(enemySystem: EnemySystem): void {
    this.enemySystem = enemySystem;
  }

  public handleAttack(client: Client, payload: { type: AttackType; weapon: WeaponType; timestamp: number | bigint }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;

    if (player.state === PlayerState.ATTACKING) return;
    if (player.state === PlayerState.DODGING) return;
    if (player.state === PlayerState.BLOCKING) return;
    if (player.weapon !== payload.weapon) {
      return;
    }

    if (payload.type === AttackType.POWER) {
      if (!player.powerAvailable) return;
      player.powerAvailable = false;
    }

    const timestamp = Number(payload.timestamp);
    const lastAttack = this.playerCooldowns.get(client.sessionId) ?? 0;
    const cooldown = payload.type === AttackType.POWER
      ? Math.max(600, getWeaponCooldown(payload.weapon))
      : getWeaponCooldown(payload.weapon);
    if (timestamp - lastAttack < cooldown) return;

    this.playerCooldowns.set(client.sessionId, timestamp);

    this.hitboxSystem.startAttack(
      client.sessionId,
      { x: player.position.x, y: player.position.y, z: player.position.z },
      payload.weapon,
      payload.type,
      timestamp,
      this.currentTick
    );

    this.pendingAttacks.push({
      clientId: client.sessionId,
      weaponType: payload.weapon,
      attackType: payload.type,
      timestamp,
      tick: this.currentTick,
    });

    player.state = PlayerState.ATTACKING;

    const existingTimer = this.stateResetTimers.get(`attack-${client.sessionId}`);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.stateResetTimers.delete(`attack-${client.sessionId}`);
      if (player && player.state === PlayerState.ATTACKING) {
        player.state = PlayerState.IDLE;
      }
    }, getWeaponCooldown(payload.weapon));
    this.stateResetTimers.set(`attack-${client.sessionId}`, timer);
  }

  public handleDodge(client: Client, payload: { direction: { x: number; y: number; z: number }; timestamp: number | bigint }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;

    const timestamp = Number(payload.timestamp);
    const lastDodge = this.playerDodgeCooldowns.get(client.sessionId) ?? 0;
    if (timestamp - lastDodge < DODGE_COOLDOWN_MS) return;

    this.playerDodgeCooldowns.set(client.sessionId, timestamp);

    const { x, z } = payload.direction;
    const mag = Math.sqrt(x * x + z * z) || 1;
    const dodgeX = player.position.x + (x / mag) * DODGE_DISTANCE;
    const dodgeZ = player.position.z + (z / mag) * DODGE_DISTANCE;

    player.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, dodgeX));
    player.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, dodgeZ));

    player.state = PlayerState.DODGING;

    const existingTimer = this.stateResetTimers.get(`dodge-${client.sessionId}`);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.stateResetTimers.delete(`dodge-${client.sessionId}`);
      if (player && player.state === PlayerState.DODGING) {
        player.state = PlayerState.IDLE;
      }
    }, 250);
    this.stateResetTimers.set(`dodge-${client.sessionId}`, timer);
  }

  public handleBlock(client: Client, payload: { active: boolean; timestamp: number | bigint }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;

    this.playerBlockStates.set(client.sessionId, payload.active);

    if (payload.active) {
      player.state = PlayerState.BLOCKING;
    } else if (player.state === PlayerState.BLOCKING) {
      player.state = PlayerState.IDLE;
    }
  }

  update(deltaTime: number): void {
    this.currentTick++;

    recordEntityPositions(this.positionHistory, this.room.state.players, 'player');
    recordEntityPositions(this.positionHistory, this.room.state.enemies, 'enemy');

    this.hitboxSystem.update(this.currentTick, this.room.state.elapsedTime);

    this.processPendingAttacks();

    this.cleanup();
  }

  private processPendingAttacks(): void {
    const newPending: PendingAttack[] = [];

    for (const attack of this.pendingAttacks) {
      const player = this.room.state.players.get(attack.clientId);
      if (!player || !player.isAlive) continue;

      const enemyMap = this.room.state.enemies;
      if (enemyMap.size === 0) continue;

      const attackerLatency = 50;

      const enemyHitData = new Map<string, { position: { x: number; y: number; z: number }; id: string; health: number }>();
      enemyMap.forEach((enemy, id) => {
        if (enemy.state !== EnemyState.DEAD) {
          enemyHitData.set(id, { position: { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z }, id, health: enemy.health });
        }
      });

      const activeHb = this.hitboxSystem.getActiveHitboxes().find(h => h.attackerId === attack.clientId);
      if (activeHb) {
        activeHb.attackerPos = { x: player.position.x, y: player.position.y, z: player.position.z };
      }

      const hits = this.hitboxSystem.checkHits(
        attack.clientId,
        enemyHitData,
        attackerLatency,
        this.room.state.elapsedTime
      );

      for (const hit of hits) {
        const enemy = enemyMap.get(hit.enemyId);
        if (!enemy || enemy.state === EnemyState.DEAD) continue;

        const dmgResult = this.damageSystem.applyDamage(
          enemy,
          attack.weaponType,
          attack.attackType
        );

        enemy.health = dmgResult.newHealth;
        if (dmgResult.stateChange) {
          enemy.state = dmgResult.stateChange;
          if (dmgResult.stateChange === EnemyState.STAGGER) {
            this.enemySystem?.applyStagger(enemy.id);
          }
        }

        const kbResult = this.knockbackSystem.applyKnockback(
          { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z },
          { x: player.position.x, y: player.position.y, z: player.position.z },
          attack.weaponType,
          attack.attackType
        );

        enemy.position.x = kbResult.position.x;
        enemy.position.z = kbResult.position.z;
        this.enemySystem?.applyKnockbackToEnemy(enemy.id, kbResult.position);

        const nearbyEnemies = Array.from(enemyMap.values())
          .filter(e => e.id !== enemy.id && e.state !== EnemyState.DEAD)
          .map(e => ({ id: e.id, position: { x: e.position.x, y: e.position.y, z: e.position.z } }));

        const chainResults = this.knockbackSystem.applyChainKnockback(
          { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z },
          nearbyEnemies,
          attack.weaponType,
          attack.attackType
        );

        for (const chain of chainResults) {
          const chainEnemy = enemyMap.get(chain.id);
          if (chainEnemy) {
            chainEnemy.position.x = chain.position.x;
            chainEnemy.position.z = chain.position.z;
            this.enemySystem?.applyKnockbackToEnemy(chain.id, chain.position);
          }
        }

        if (dmgResult.killed) {
          enemy.health = 0;
          enemy.state = EnemyState.DEAD;
          this.enemySystem?.removeEnemy(enemy.id);
          this.room.broadcast(MESSAGE_SERVER.GAME_EVENT, {
            event: GameEvent.PLAYER_KILLED,
            data: {
              enemyId: enemy.id,
              killerId: attack.clientId,
              attackType: attack.attackType,
              weapon: attack.weaponType,
              isPower: attack.attackType === AttackType.POWER,
              position: { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z },
            },
          });
        } else {
          this.room.broadcast(MESSAGE_SERVER.GAME_EVENT, {
            event: 'enemy_damaged',
            data: {
              enemyId: enemy.id,
              damage: dmgResult.damageDealt,
              health: dmgResult.newHealth,
              attackerId: attack.clientId,
              attackType: attack.attackType,
              weapon: attack.weaponType,
              isPower: attack.attackType === AttackType.POWER,
              position: { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z },
            },
          });
        }
      }

      const activeHitbox = this.hitboxSystem.getActiveHitboxes().find(h => h.attackerId === attack.clientId);
      const maxFrames = activeHitbox?.weaponProfile.activeFrames ?? 3;
      const elapsedTicks = this.currentTick - attack.tick;
      if (elapsedTicks < maxFrames) {
        newPending.push(attack);
      }
    }

    this.pendingAttacks = newPending;
  }

  private cleanup(): void {
    for (const [clientId] of this.playerCooldowns) {
      if (!this.room.state.players.has(clientId)) {
        this.playerCooldowns.delete(clientId);
      }
    }
    for (const [clientId] of this.playerDodgeCooldowns) {
      if (!this.room.state.players.has(clientId)) {
        this.playerDodgeCooldowns.delete(clientId);
      }
    }
    for (const [clientId] of this.playerBlockStates) {
      if (!this.room.state.players.has(clientId)) {
        this.playerBlockStates.delete(clientId);
      }
    }
  }

  onPlayerLeave(clientId: string): void {
    this.playerCooldowns.delete(clientId);
    this.playerDodgeCooldowns.delete(clientId);
    this.playerBlockStates.delete(clientId);
    this.hitboxSystem.clearAttackerHitboxes(clientId);
    const attackTimer = this.stateResetTimers.get(`attack-${clientId}`);
    if (attackTimer) clearTimeout(attackTimer);
    this.stateResetTimers.delete(`attack-${clientId}`);
    const dodgeTimer = this.stateResetTimers.get(`dodge-${clientId}`);
    if (dodgeTimer) clearTimeout(dodgeTimer);
    this.stateResetTimers.delete(`dodge-${clientId}`);
  }

  dispose(): void {
    for (const timer of this.stateResetTimers.values()) {
      clearTimeout(timer);
    }
    this.stateResetTimers.clear();
  }

  getPositionHistory(): PositionHistory {
    return this.positionHistory;
  }
}