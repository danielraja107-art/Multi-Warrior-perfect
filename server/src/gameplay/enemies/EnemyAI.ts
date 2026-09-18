import { EnemyState, EnemyType } from '@storm-arena/shared';

export type AIState =
  | 'IDLE'
  | 'DETECT'
  | 'CHASE'
  | 'ATTACK'
  | 'RECOVER'
  | 'STAGGER'
  | 'KNOCKBACK'
  | 'DEAD';

interface StateTransition {
  from: AIState;
  to: AIState;
  condition: (ctx: AIContext) => boolean;
}

interface AIContext {
  enemy: EnemyAIState;
  players: Map<string, { position: { x: number; y: number; z: number }; health: number }>;
  currentTime: number;
  tick: number;
}

export { AIContext };

export interface EnemyAIState {
  id: string;
  type: EnemyType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  state: EnemyState;
  targetPlayerId: string;
  lastAttackTime: number;
  attackCooldown: number;
  detectionRange: number;
  attackRange: number;
  speed: number;
  damage: number;
  knockbackResistance: number;
}

const VALID_TRANSITIONS: Record<AIState, AIState[]> = {
  IDLE: ['DETECT', 'STAGGER', 'KNOCKBACK', 'DEAD'],
  DETECT: ['IDLE', 'CHASE', 'STAGGER', 'KNOCKBACK', 'DEAD'],
  CHASE: ['DETECT', 'ATTACK', 'STAGGER', 'KNOCKBACK', 'DEAD'],
  ATTACK: ['CHASE', 'RECOVER', 'STAGGER', 'KNOCKBACK', 'DEAD'],
  RECOVER: ['CHASE', 'DETECT', 'STAGGER', 'KNOCKBACK', 'DEAD'],
  STAGGER: ['CHASE', 'RECOVER', 'KNOCKBACK', 'DEAD'],
  KNOCKBACK: ['CHASE', 'RECOVER', 'STAGGER', 'DEAD'],
  DEAD: [],
};

export class EnemyAI {
  private currentState: AIState = 'IDLE';
  private staggerEndTime = 0;
  private knockbackEndTime = 0;
  private recoverEndTime = 0;

  getState(): AIState {
    return this.currentState;
  }

  setState(newState: AIState, ctx?: AIContext): boolean {
    const allowed = VALID_TRANSITIONS[this.currentState] ?? [];
    if (!allowed.includes(newState)) {
      return false;
    }
    this.currentState = newState;
    return true;
  }

  update(ctx: AIContext): void {
    const { enemy, players, currentTime, tick } = ctx;

    if (enemy.health <= 0) {
      this.setState('DEAD');
      return;
    }

    if (this.currentState === 'STAGGER' && currentTime >= this.staggerEndTime) {
      this.applyRecover(800, currentTime);
      return;
    }
    if (this.currentState === 'KNOCKBACK' && currentTime >= this.knockbackEndTime) {
      this.applyRecover(800, currentTime);
      return;
    }
    if (this.currentState === 'RECOVER' && currentTime >= this.recoverEndTime) {
      this.setState('CHASE');
    }

    let target = enemy.targetPlayerId ? players.get(enemy.targetPlayerId) : undefined;
    if (!target && players.size > 0) {
      target = players.values().next().value;
    }
    const hasTarget = !!target;
    const distanceToTarget = target
      ? Math.sqrt(
          (target.position.x - enemy.position.x) ** 2 +
          (target.position.z - enemy.position.z) ** 2
        )
      : Infinity;

    switch (this.currentState) {
      case 'IDLE':
        if (hasTarget && distanceToTarget <= enemy.detectionRange) {
          this.setState('DETECT');
        }
        break;

      case 'DETECT':
        if (!hasTarget || distanceToTarget > enemy.detectionRange) {
          this.setState('IDLE');
        } else {
          this.setState('CHASE');
        }
        break;

      case 'CHASE':
        if (!hasTarget || distanceToTarget > enemy.detectionRange * 1.2) {
          this.setState('DETECT');
        } else if (distanceToTarget <= enemy.attackRange) {
          this.setState('ATTACK');
        }
        break;

      case 'ATTACK':
        if (!hasTarget || distanceToTarget > enemy.attackRange * 1.2) {
          this.setState('CHASE');
        } else if (currentTime - enemy.lastAttackTime >= enemy.attackCooldown) {
          this.setState('RECOVER');
        }
        break;

      case 'RECOVER':
        if (hasTarget && distanceToTarget <= enemy.attackRange) {
          this.setState('ATTACK');
        } else {
          this.setState('CHASE');
        }
        break;
    }
  }

  applyStagger(duration: number, currentTime: number): void {
    if (this.currentState === 'DEAD') return;
    this.staggerEndTime = currentTime + duration;
    this.setState('STAGGER');
  }

  applyKnockback(duration: number, currentTime: number): void {
    if (this.currentState === 'DEAD') return;
    this.knockbackEndTime = currentTime + duration;
    this.setState('KNOCKBACK');
  }

  applyRecover(duration: number, currentTime: number): void {
    if (this.currentState === 'DEAD') return;
    this.recoverEndTime = currentTime + duration;
    this.setState('RECOVER');
  }

  canAttack(currentTime: number, cooldown: number): boolean {
    return this.currentState !== 'ATTACK';
  }
}

export function createEnemyAIState(
  id: string,
  type: EnemyType,
  position: { x: number; y: number; z: number },
  config: { maxHealth: number; speed: number; attackRange: number; detectionRange: number; attackCooldown: number; knockbackResistance: number; damage: number },
  currentTime = 0
): EnemyAIState {
  return {
    id,
    type,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    state: EnemyState.IDLE,
    targetPlayerId: '',
    lastAttackTime: currentTime,
    attackCooldown: config.attackCooldown,
    detectionRange: config.detectionRange,
    attackRange: config.attackRange,
    speed: config.speed,
    damage: config.damage,
    knockbackResistance: config.knockbackResistance,
  };
}