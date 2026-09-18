import { Room } from 'colyseus';
import {
  GameState,
  Boss,
  BossPhase,
  BossAttack,
  Player,
  GameEvent,
  RoomPhase,
} from '@storm-arena/shared';
import { getBossHealth } from '@storm-arena/shared';

type BossState =
  | 'idle'
  | 'chase'
  | 'attack'
  | 'roar'
  | 'charge'
  | 'slam'
  | 'sweep'
  | 'spin'
  | 'grab'
  | 'enraged_idle'
  | 'enraged_chase'
  | 'enraged_attack'
  | 'death';

interface BossConfig {
  speed: number;
  enragedSpeed: number;
  attackRange: number;
  chargeRange: number;
  detectionRange: number;
  attackCooldown: number;
  slamCooldown: number;
  sweepCooldown: number;
  spinCooldown: number;
  grabCooldown: number;
  roarCooldown: number;
  chargeSpeed: number;
  chargeDamage: number;
  slamDamage: number;
  sweepDamage: number;
  punchDamage: number;
  spinDamage: number;
  grabDamage: number;
  roarDamage: number;
}

const BOSS_CONFIGS: Record<string, BossConfig> = {
  easy: {
    speed: 2.5, enragedSpeed: 4.0, attackRange: 2.5, chargeRange: 12,
    detectionRange: 20, attackCooldown: 1800, slamCooldown: 3000,
    sweepCooldown: 2500, spinCooldown: 2800, grabCooldown: 3500,
    roarCooldown: 5000, chargeSpeed: 8, chargeDamage: 20, slamDamage: 25,
    sweepDamage: 15, punchDamage: 18, spinDamage: 12, grabDamage: 22, roarDamage: 0,
  },
  normal: {
    speed: 3.0, enragedSpeed: 5.0, attackRange: 2.8, chargeRange: 14,
    detectionRange: 22, attackCooldown: 1500, slamCooldown: 2500,
    sweepCooldown: 2200, spinCooldown: 2500, grabCooldown: 3000,
    roarCooldown: 4000, chargeSpeed: 10, chargeDamage: 25, slamDamage: 30,
    sweepDamage: 20, punchDamage: 22, spinDamage: 15, grabDamage: 28, roarDamage: 0,
  },
  hard: {
    speed: 3.5, enragedSpeed: 6.0, attackRange: 3.0, chargeRange: 16,
    detectionRange: 25, attackCooldown: 1200, slamCooldown: 2000,
    sweepCooldown: 1800, spinCooldown: 2000, grabCooldown: 2500,
    roarCooldown: 3000, chargeSpeed: 12, chargeDamage: 30, slamDamage: 38,
    sweepDamage: 25, punchDamage: 28, spinDamage: 18, grabDamage: 35, roarDamage: 0,
  },
};

export class BossController {
  private room: Room<GameState>;
  private boss!: Boss;
  private config: BossConfig;
  private state: BossState = 'idle';
  private targetPlayerId: string | null = null;
  private difficulty: string;

  private lastAttackTime = 0;
  private lastSweepTime = 0;
  private lastSlamTime = 0;
  private lastSpinTime = 0;
  private lastGrabTime = 0;
  private lastRoarTime = 0;
  private lastChargeTime = 0;

  private attackAnimating = false;
  private attackAnimTimer = 0;
  private chargeAnimating = false;
  private chargeTimer = 0;
  private chargeDir = { x: 0, z: 0 };

  private now = 0;

  constructor(room: Room<GameState>) {
    this.room = room;
    this.difficulty = room.state?.difficulty ?? 'normal';
    this.config = BOSS_CONFIGS[this.difficulty] ?? BOSS_CONFIGS.normal;
  }

  private get bossRef(): Boss {
    return this.room.state.boss;
  }

  spawnBoss(playerCount: number): void {
    const boss = this.bossRef;
    const maxHealth = getBossHealth(playerCount);

    boss.id = 'boss-main';
    boss.maxHealth = maxHealth;
    boss.health = maxHealth;
    boss.phase = BossPhase.PHASE_1;
    boss.currentAttack = '';
    boss.isEnraged = false;
    boss.isActive = true;
    boss.position.x = 0;
    boss.position.y = 0;
    boss.position.z = -15;
    boss.rotation.x = 0;
    boss.rotation.y = 0;
    boss.rotation.z = 0;

    this.state = 'idle';
    this.targetPlayerId = null;
    this.lastAttackTime = 0;
    this.lastSweepTime = 0;
    this.lastSlamTime = 0;
    this.lastSpinTime = 0;
    this.lastGrabTime = 0;
    this.lastRoarTime = 0;
    this.lastChargeTime = 0;
    this.attackAnimating = false;
    this.chargeAnimating = false;

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.BOSS_SPAWN,
      data: {
        wave: this.room.state.currentWave,
        phase: boss.phase,
        maxHealth,
      },
    });
  }

  tick(deltaMs: number, players: Map<string, Player>): void {
    const boss = this.bossRef;
    if (!boss.isActive) return;

    this.now = performance.now();
    const dt = deltaMs / 1000;

    if (boss.health <= 0) {
      this.handleDeath();
      return;
    }

    if (this.attackAnimating) {
      this.attackAnimTimer -= deltaMs;
      if (this.attackAnimTimer <= 0) {
        this.attackAnimating = false;
        boss.currentAttack = '';
      }
      return;
    }

    if (this.chargeAnimating) {
      this.tickCharge(dt);
      return;
    }

    this.selectTarget(players);

    if (!this.targetPlayerId) {
      this.state = boss.isEnraged ? 'enraged_idle' : 'idle';
      return;
    }

    const target = players.get(this.targetPlayerId);
    if (!target || !target.isAlive) {
      this.targetPlayerId = null;
      this.state = 'idle';
      return;
    }

    const dx = target.position.x - boss.position.x;
    const dz = target.position.z - boss.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    this.faceTarget(target);

    if (boss.isEnraged) {
      this.tickEnraged(dist, target, dt);
    } else {
      this.tickNormal(dist, target, dt);
    }
  }

  syncPhaseFromHealth(): void {
    const boss = this.bossRef;
    if (!boss.isActive) return;

    const ratio = boss.maxHealth > 0 ? boss.health / boss.maxHealth : 0;
    let nextPhase = BossPhase.PHASE_1;

    if (ratio < 0.2) nextPhase = BossPhase.ENRAGED;
    else if (ratio <= 0.5) nextPhase = BossPhase.PHASE_3;
    else if (ratio <= 0.75) nextPhase = BossPhase.PHASE_2;

    if (nextPhase !== boss.phase) {
      boss.phase = nextPhase;
      boss.isEnraged = nextPhase === BossPhase.ENRAGED;
      this.room.broadcast('GAME_EVENT', {
        event: GameEvent.BOSS_PHASE_CHANGE,
        data: { phase: boss.phase, isEnraged: boss.isEnraged },
      });
    } else {
      boss.isEnraged = nextPhase === BossPhase.ENRAGED;
    }
  }

  defeatBoss(): boolean {
    const boss = this.bossRef;
    if (!boss.isActive) return false;
    boss.health = 0;
    boss.isActive = false;
    boss.isEnraged = false;
    boss.currentAttack = '';
    this.room.state.phase = RoomPhase.VICTORY;

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.BOSS_DEFEATED,
      data: {
        phase: boss.phase,
        health: 0,
        maxHealth: boss.maxHealth,
        victory: true,
      },
    });

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.MATCH_END,
      data: { victory: true },
    });

    return true;
  }

  getAttackHitbox(): { x: number; z: number; radius: number; damage: number; type: string } | null {
    if (!this.attackAnimating && !this.chargeAnimating) return null;

    const boss = this.bossRef;
    const attack = boss.currentAttack;
    if (!attack) return null;

    let radius = 2.5;
    let damage = this.config.punchDamage;

    switch (attack) {
      case BossAttack.HEAVY_PUNCH:
        radius = 2.5;
        damage = this.config.punchDamage;
        break;
      case BossAttack.SWEEP:
        radius = 3.5;
        damage = this.config.sweepDamage;
        break;
      case BossAttack.SLAM:
        radius = 4.0;
        damage = this.config.slamDamage;
        break;
      case BossAttack.SPIN_ATTACK:
        radius = 3.0;
        damage = this.config.spinDamage;
        break;
      case BossAttack.GRAB_THROW:
        radius = 2.0;
        damage = this.config.grabDamage;
        break;
      case BossAttack.CHARGE:
        radius = 2.0;
        damage = this.config.chargeDamage;
        break;
      case BossAttack.ROAR:
        return null;
      default:
        return null;
    }

    return { x: boss.position.x, z: boss.position.z, radius, damage, type: attack };
  }

  isAttackActive(): boolean {
    return this.attackAnimating || this.chargeAnimating;
  }

  reset(): void {
    this.state = 'idle';
    this.targetPlayerId = null;
    this.attackAnimating = false;
    this.chargeAnimating = false;
    this.lastAttackTime = 0;
    this.lastSweepTime = 0;
    this.lastSlamTime = 0;
    this.lastSpinTime = 0;
    this.lastGrabTime = 0;
    this.lastRoarTime = 0;
    this.lastChargeTime = 0;
  }

  setDifficulty(difficulty: string): void {
    this.difficulty = difficulty;
    this.config = BOSS_CONFIGS[difficulty] ?? BOSS_CONFIGS.normal;
  }

  private tickNormal(dist: number, target: Player, dt: number): void {
    if (dist <= this.config.attackRange) {
      const attack = this.pickAttack(dist);
      if (attack) {
        this.executeAttack(attack);
        return;
      }
    }

    if (dist <= this.config.attackRange) {
      this.state = 'idle';
      return;
    }

    if (dist <= this.config.chargeRange && this.canCharge()) {
      this.startCharge(target);
      return;
    }

    this.state = 'chase';
    this.moveToward(target, this.config.speed, dt);
  }

  private tickEnraged(dist: number, target: Player, dt: number): void {
    if (dist <= this.config.attackRange) {
      const attack = this.pickAttack(dist);
      if (attack) {
        this.executeAttack(attack);
        return;
      }
    }

    if (dist <= this.config.attackRange) {
      this.state = 'enraged_idle';
      return;
    }

    if (dist <= this.config.chargeRange && this.canCharge()) {
      this.startCharge(target);
      return;
    }

    this.state = 'enraged_chase';
    this.moveToward(target, this.config.enragedSpeed, dt);
  }

  private pickAttack(dist: number): BossAttack | null {
    const now = this.now;

    if (dist <= 2.0 && this.canSlam(now)) return BossAttack.SLAM;
    if (dist <= 2.5 && this.canSweep(now)) return BossAttack.SWEEP;
    if (dist <= 2.0 && this.canGrab(now)) return BossAttack.GRAB_THROW;
    if (dist <= 2.5 && this.canSpin(now)) return BossAttack.SPIN_ATTACK;
    if (this.canPunch(now)) return BossAttack.HEAVY_PUNCH;
    if (this.canRoar(now)) return BossAttack.ROAR;
    return null;
  }

  private executeAttack(attack: BossAttack): void {
    const boss = this.bossRef;
    boss.currentAttack = attack;
    this.attackAnimating = true;

    switch (attack) {
      case BossAttack.HEAVY_PUNCH:
        this.attackAnimTimer = 800;
        this.lastAttackTime = this.now;
        break;
      case BossAttack.SWEEP:
        this.attackAnimTimer = 1000;
        this.lastSweepTime = this.now;
        this.state = 'sweep';
        break;
      case BossAttack.SLAM:
        this.attackAnimTimer = 1200;
        this.lastSlamTime = this.now;
        this.state = 'slam';
        break;
      case BossAttack.SPIN_ATTACK:
        this.attackAnimTimer = 1100;
        this.lastSpinTime = this.now;
        this.state = 'spin';
        break;
      case BossAttack.GRAB_THROW:
        this.attackAnimTimer = 1400;
        this.lastGrabTime = this.now;
        this.state = 'grab';
        break;
      case BossAttack.ROAR:
        this.attackAnimTimer = 1500;
        this.lastRoarTime = this.now;
        this.state = 'roar';
        break;
      case BossAttack.CHARGE:
        break;
    }
  }

  private startCharge(target: Player): void {
    this.chargeAnimating = true;
    this.chargeTimer = 1500;
    this.bossRef.currentAttack = BossAttack.CHARGE;
    this.state = 'charge';
    this.lastChargeTime = this.now;

    const dx = target.position.x - this.bossRef.position.x;
    const dz = target.position.z - this.bossRef.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.01) {
      this.chargeDir = { x: dx / dist, z: dz / dist };
    }
  }

  private tickCharge(dt: number): void {
    this.chargeTimer -= dt * 1000;

    this.bossRef.position.x += this.chargeDir.x * this.config.chargeSpeed * dt;
    this.bossRef.position.z += this.chargeDir.z * this.config.chargeSpeed * dt;

    const boundary = 20;
    this.bossRef.position.x = Math.max(-boundary, Math.min(boundary, this.bossRef.position.x));
    this.bossRef.position.z = Math.max(-boundary, Math.min(boundary, this.bossRef.position.z));

    if (this.chargeDir.x !== 0 || this.chargeDir.z !== 0) {
      this.bossRef.rotation.y = Math.atan2(this.chargeDir.x, this.chargeDir.z);
    }

    if (this.chargeTimer <= 0) {
      this.chargeAnimating = false;
      this.bossRef.currentAttack = '';
      this.attackAnimTimer = 600;
      this.attackAnimating = true;
    }
  }

  private moveToward(target: Player, speed: number, dt: number): void {
    const dx = target.position.x - this.bossRef.position.x;
    const dz = target.position.z - this.bossRef.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) return;

    this.bossRef.position.x += (dx / dist) * speed * dt;
    this.bossRef.position.z += (dz / dist) * speed * dt;

    const boundary = 20;
    this.bossRef.position.x = Math.max(-boundary, Math.min(boundary, this.bossRef.position.x));
    this.bossRef.position.z = Math.max(-boundary, Math.min(boundary, this.bossRef.position.z));
  }

  private faceTarget(target: Player): void {
    const dx = target.position.x - this.bossRef.position.x;
    const dz = target.position.z - this.bossRef.position.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      this.bossRef.rotation.y = Math.atan2(dx, dz);
    }
  }

  private selectTarget(players: Map<string, Player>): void {
    let closest: string | null = null;
    let closestDist = Infinity;

    players.forEach((player, id) => {
      if (!player.isAlive) return;
      const dx = player.position.x - this.bossRef.position.x;
      const dz = player.position.z - this.bossRef.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closest = id;
      }
    });

    this.targetPlayerId = closest;
  }

  private handleDeath(): void {
    if (this.state === 'death') return;
    this.state = 'death';
    this.bossRef.currentAttack = '';
    this.bossRef.isActive = false;
    this.attackAnimating = false;
    this.chargeAnimating = false;
  }

  private canPunch(now: number): boolean { return now - this.lastAttackTime >= this.config.attackCooldown; }
  private canSweep(now: number): boolean { return now - this.lastSweepTime >= this.config.sweepCooldown; }
  private canSlam(now: number): boolean { return now - this.lastSlamTime >= this.config.slamCooldown; }
  private canSpin(now: number): boolean { return now - this.lastSpinTime >= this.config.spinCooldown; }
  private canGrab(now: number): boolean { return now - this.lastGrabTime >= this.config.grabCooldown; }
  private canRoar(now: number): boolean { return now - this.lastRoarTime >= this.config.roarCooldown; }
  private canCharge(): boolean { return this.now - this.lastChargeTime >= 4000; }
}
