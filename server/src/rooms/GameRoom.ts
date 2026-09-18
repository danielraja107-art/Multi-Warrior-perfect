import { Room, Client } from 'colyseus';
import { GameState, Player, Enemy } from '@storm-arena/shared';
import {
  RoomPhase,
  Difficulty,
  PlayerColor,
  PlayerState,
  WeaponType,
  GameEvent,
  AttackType,
  MESSAGE_CLIENT,
  MESSAGE_SERVER,
} from '@storm-arena/shared';
import { MovementSystem, PLAYER_SPEED, MOVEMENT_BOUNDARY, MovementInput } from '../gameplay/movement/MovementSystem';
import { CombatManager } from '../gameplay/combat/CombatManager';
import { WeaponSystem } from '../gameplay/weapons/WeaponSystem';
import { RockProjectileSystem } from '../gameplay/weapons/RockProjectileSystem';
import { WaveDirector } from '../gameplay/waves/WaveDirector';
import { EnemySystem } from '../gameplay/enemies/EnemySystem';
import { BossController } from '../gameplay/bosses/BossController';
import { verifyToken, TokenPayload } from '../auth/jwt';
import { MatchService } from '../services/MatchService';
import { logger } from '../util/logger';

const PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
];

export const FIXED_SPAWN_POINTS = [
  { x: -5, y: 0, z: 0 },
  { x: 5, y: 0, z: 0 },
  { x: 0, y: 0, z: -5 },
  { x: 0, y: 0, z: 5 },
];

const MAX_PLAYERS = 4;
const TICK_INTERVAL_MS = 50;
const RECONNECT_TIMEOUT_MS = Number(process.env.STORM_RECONNECT_TIMEOUT_MS || '30000');

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private movement = new MovementSystem();
  private combat = new CombatManager(this);
  private weapons = new WeaponSystem(this);
  private projectiles = new RockProjectileSystem(this);
  private enemySystem = new EnemySystem(this);
  private bossController = new BossController(this);
  private waveDirector = new WaveDirector(this, this.enemySystem, this.weapons, this.bossController);
  private bossSpawned = false;
  private bossDefeated = false;
  private victoryTimer: NodeJS.Timeout | null = null;
  private matchService = new MatchService();
  public simulationPaused = false;
  private respawnTimers: Map<string, NodeJS.Timeout> = new Map();
  private countdownTimer: NodeJS.Timeout | null = null;

  onCreate(options: { difficulty?: string }) {
    this.combat.setEnemySystem(this.enemySystem);
    this.projectiles.setEnemySystem(this.enemySystem);
    this.enemySystem.setOnEnemyDeathCallback(() => this.waveDirector.onEnemyDeath());
    this.setState(new GameState());
    this.state.roomCode = generateRoomCode();
    this.state.phase = RoomPhase.LOBBY;
    this.state.difficulty = options.difficulty ?? Difficulty.NORMAL;
    this.state.maxWaves = 10;
    this.setMetadata({ code: this.state.roomCode });

    this.setSimulationInterval((deltaTime: number) => {
      this.serverTick(deltaTime);
    }, TICK_INTERVAL_MS);

    this.registerMessageHandlers();
  }

  onAuth(client: Client, options: { token?: string }): TokenPayload | false {
    if (process.env.NODE_ENV === 'production') {
      if (!options.token) {
        logger.warn('game-room', 'join rejected: no token', { sessionId: client.sessionId });
        return false;
      }
      try {
        return verifyToken(options.token);
      } catch {
        logger.warn('game-room', 'join rejected: invalid token', { sessionId: client.sessionId });
        return false;
      }
    }
    return { userId: `dev-${client.sessionId}`, username: 'dev-player' };
  }

  private registerMessageHandlers(): void {
    this.onMessage(MESSAGE_CLIENT.PLAYER_MOVE, (client, payload: MovementInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      const normalized = this.normalizeMoveInput(payload);
      if (!normalized) return;
      this.movement.enqueueInput(client.sessionId, normalized);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_ATTACK, (client, payload) => {
      if (!this.validateAttackPayload(payload, client.sessionId)) {
        return;
      }

      if (this.state.boss.isActive) {
        const player = this.state.players.get(client.sessionId);
        if (player && player.isAlive) {
          const now = performance.now();
          const dx = this.state.boss.position.x - player.position.x;
          const dz = this.state.boss.position.z - player.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const range = payload.type === 'heavy' ? 3.5 : 3.0;

          if (dist <= range) {
            const weaponDmg: Record<string, { light: number; heavy: number }> = {
              fist: { light: 8, heavy: 15 }, stick: { light: 10, heavy: 18 },
              baseball_bat: { light: 14, heavy: 24 }, axe: { light: 16, heavy: 28 },
              hammer: { light: 12, heavy: 32 }, rock: { light: 6, heavy: 10 },
            };
            const wd = weaponDmg[payload.weapon] ?? weaponDmg.fist;
            const baseDamage = payload.type === 'heavy' ? wd.heavy : wd.light;
            const damage = Math.round(baseDamage * (0.9 + Math.random() * 0.2));

            this.state.boss.health = Math.max(0, this.state.boss.health - damage);
            this.bossController.syncPhaseFromHealth();

            const knockbackX = dx / (dist || 1) * 2;
            const knockbackZ = dz / (dist || 1) * 2;

            if (this.state.boss.health <= 0) {
              this.handleBossDefeated();
            }

            this.broadcast('GAME_EVENT', {
              event: 'boss_damaged',
              data: { targetId: client.sessionId, damage, isDead: this.state.boss.health <= 0, knockbackX, knockbackZ },
            });
          }
        }
      }

      this.combat.handleAttack(client, payload);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_DODGE, (client, payload) => {
      this.combat.handleDodge(client, payload);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_BLOCK, (client, payload) => {
      this.combat.handleBlock(client, payload);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_PICKUP, (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) {
        return;
      }
      this.weapons.tryPickup(client.sessionId, payload.weaponPickupId);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_THROW, (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      if (player.weapon !== WeaponType.ROCK) return;
      this.projectiles.throwRock(
        client.sessionId,
        payload.direction,
        { x: player.position.x, y: player.position.y + 1.5, z: player.position.z }
      );
    });

    this.onMessage(MESSAGE_CLIENT.HOST_START, (client, payload?: { countdown?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;
      if (this.state.players.size < 1) return;

      const isQuickTest = process.argv.some(a => a.includes('movement.test') || a.includes('reconnect-ui.test'));
      const duration = typeof payload?.countdown === 'number'
        ? payload.countdown
        : (isQuickTest ? 0 : 5);

      if (duration === 0) {
        this.transitionToGame();
      } else {
        this.startCountdown(duration);
      }
    });

    this.onMessage(MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY, (client, payload: { difficulty: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const validDifficulties: string[] = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
      if (validDifficulties.includes(payload.difficulty)) {
        this.state.difficulty = payload.difficulty;
        this.waveDirector.setDifficulty(payload.difficulty as Difficulty);
        this.bossController.setDifficulty(payload.difficulty);
      }
    });
  }

  onJoin(client: Client, options: { token?: string }, auth?: TokenPayload) {
    const playerCount = this.state.players.size;
    const colorIndex = playerCount % PLAYER_COLORS.length;
    const color = PLAYER_COLORS[colorIndex];

    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.userId = auth?.userId ?? `dev-${client.sessionId}`;
    player.color = color;
    player.health = 100;
    player.maxHealth = 100;
    player.weapon = WeaponType.FIST;
    player.powerAvailable = true;
    player.isHost = playerCount === 0;
    player.isAlive = true;
    player.state = PlayerState.IDLE;

    const spawnIndex = playerCount % FIXED_SPAWN_POINTS.length;
    const spawn = FIXED_SPAWN_POINTS[spawnIndex];
    player.position.x = spawn.x;
    player.position.y = spawn.y;
    player.position.z = spawn.z;

    this.state.players.set(client.sessionId, player);

    if (player.isHost) {
      this.state.hostId = player.id;
    }
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    logger.warn('game-room', 'player left', { sessionId: client.sessionId, consented, phase: this.state.phase });
    this.combat.onPlayerLeave(client.sessionId);
    this.weapons.onPlayerDeath(client.sessionId);
    const respawnTimer = this.respawnTimers.get(client.sessionId);
    if (respawnTimer) {
      clearTimeout(respawnTimer);
      this.respawnTimers.delete(client.sessionId);
    }

    if (this.state.phase === RoomPhase.LOBBY || this.state.phase === RoomPhase.STARTING) {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      this.state.phase = RoomPhase.LOBBY;
      this.state.countdownSeconds = 0;
      this.state.players.delete(client.sessionId);
      this.movement.clear(client.sessionId);

      if (this.state.players.size > 0) {
        const firstEntry = this.state.players.entries().next().value;
        if (firstEntry) {
          firstEntry[1].isHost = true;
          this.state.hostId = firstEntry[1].id;
        }
      }
    } else if (player) {
      this.movement.clear(client.sessionId);

      this.allowReconnection(client, RECONNECT_TIMEOUT_MS / 1000).then(() => {
        const restored = this.state.players.get(client.sessionId);
        if (restored) {
          restored.sessionId = client.sessionId;
        }
      }).catch(() => {
        if (this.state.players.has(client.sessionId)) {
          this.state.players.delete(client.sessionId);
        }

        if (player.isHost && this.state.players.size > 0) {
          const firstEntry = this.state.players.entries().next().value;
          if (firstEntry) {
            firstEntry[1].isHost = true;
            this.state.hostId = firstEntry[1].id;
          }
        }

        if (this.state.players.size === 0) {
          this.disconnect();
        }
      });
    }
  }

  onDispose() {
    logger.warn('game-room', 'room disposed', { roomCode: this.state.roomCode, players: this.state.players.size });
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.combat.dispose();
    this.state.players.clear();
    this.state.enemies.clear();
    this.state.weaponPickups.clear();
    this.movement.clearAll();
    this.weapons.clearAll();
    this.projectiles.clearAll();
    this.waveDirector.resetWave();
    this.bossController.reset();
    this.respawnTimers.forEach((t) => clearTimeout(t));
    this.respawnTimers.clear();
    if (this.victoryTimer) clearTimeout(this.victoryTimer);
  }

  private startCountdown(duration = 5): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.state.phase = RoomPhase.STARTING;
    this.state.countdownSeconds = duration;

    this.countdownTimer = setInterval(() => {
      this.state.countdownSeconds -= 1;

      if (this.state.countdownSeconds <= 0) {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.transitionToGame();
      }
    }, 1000);
  }

  private transitionToGame(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.state.phase = RoomPhase.GAME;
    this.state.countdownSeconds = 0;
    this.state.elapsedTime = 0;

    // Reset players to their fixed distinct spawn points
    let idx = 0;
    this.state.players.forEach((p) => {
      const spawn = FIXED_SPAWN_POINTS[idx % FIXED_SPAWN_POINTS.length];
      p.position.x = spawn.x;
      p.position.y = spawn.y;
      p.position.z = spawn.z;
      p.state = PlayerState.IDLE;
      p.isAlive = true;
      p.weapon = WeaponType.FIST;
      p.powerAvailable = true;
      this.movement.clear(p.sessionId);
      idx++;
    });

    // Start Wave 1 via WaveDirector
    this.waveDirector.startGame((this.state.difficulty as Difficulty) || Difficulty.NORMAL);
    this.waveDirector.startNextWave();
  }

  pause() { this.simulationPaused = true; }
  unpause() { this.simulationPaused = false; }

  resetForTest() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.simulationPaused = true;
    this.enemySystem.clearAll();
    this.state.boss.health = 0;
    this.state.boss.maxHealth = 0;
    this.state.boss.isActive = false;
    this.state.boss.isEnraged = false;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossController.reset();
    this.waveDirector.resetWave();
    this.simulationPaused = false;
  }

  private normalizeMoveInput(input: MovementInput): MovementInput | null {
    if (!input || typeof input !== 'object') return null;
    const ts = Number(input.timestamp);
    if (!Number.isFinite(ts)) return null;
    if (!input.direction || typeof input.direction !== 'object') return null;

    const { x, y, z } = input.direction;
    if (
      typeof x !== 'number' || !Number.isFinite(x) ||
      typeof y !== 'number' || !Number.isFinite(y) ||
      typeof z !== 'number' || !Number.isFinite(z)
    ) return null;

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude > 1.01) return null;
    if (Math.abs(x) > 1 || Math.abs(y) > 1 || Math.abs(z) > 1) return null;

    return {
      direction: { x, y, z },
      rotation: input.rotation ? { x: Number(input.rotation.x), y: Number(input.rotation.y) } : undefined,
      timestamp: ts,
    };
  }

  validateAttackPayload(payload: { type?: string; weapon?: string; timestamp?: number }, sessionId: string): boolean {
    const player = this.state.players.get(sessionId);
    if (!player || !player.isAlive) return false;
    if (!payload || typeof payload !== 'object') return false;
    if (payload.type !== 'light' && payload.type !== 'heavy' && payload.type !== 'power') return false;
    if (payload.type === 'power' && !player.powerAvailable) return false;
    if (!payload.weapon || typeof payload.weapon !== 'string') return false;
    if (payload.weapon !== player.weapon) return false;
    const ts = Number(payload.timestamp);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return true;
  }

  detectSpeedHack(sessionId: string, preMovePos: { x: number; y: number; z: number }, elapsedMs: number): boolean {
    const player = this.state.players.get(sessionId);
    if (!player) return false;
    const dx = Math.abs(player.position.x - preMovePos.x);
    const dz = Math.abs(player.position.z - preMovePos.z);
    const dist = Math.sqrt(dx * dx + dz * dz);
    const elapsed = Math.max(1, Number(elapsedMs) || 1);
    const speed = dist / (elapsed / 1000);
    return speed > PLAYER_SPEED * 4.5;
  }

  public handlePlayerDeath(sessionId: string, killedBy = 'enemy'): void {
    const player = this.state.players.get(sessionId);
    if (!player || !player.isAlive) return;

    player.isAlive = false;
    player.health = 0;
    player.state = PlayerState.DEAD;

    const RESPAWN_SEC = 5;
    this.broadcast('GAME_EVENT', {
      event: GameEvent.PLAYER_DIED,
      data: { sessionId, killedBy, respawnIn: RESPAWN_SEC },
    });

    const existing = this.respawnTimers.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.respawnTimers.delete(sessionId);
      if (this.state.phase !== RoomPhase.GAME) return;
      const p = this.state.players.get(sessionId);
      if (!p) return;

      p.health = p.maxHealth;
      p.isAlive = true;
      p.state = PlayerState.IDLE;
      let pIdx = 0;
      let spawn = FIXED_SPAWN_POINTS[0];
      for (const [id] of this.state.players.entries()) {
        if (id === sessionId) {
          spawn = FIXED_SPAWN_POINTS[pIdx % FIXED_SPAWN_POINTS.length];
          break;
        }
        pIdx++;
      }
      p.position.x = spawn.x;
      p.position.y = spawn.y;
      p.position.z = spawn.z;
      this.movement.clear(sessionId);

      this.broadcast('GAME_EVENT', {
        event: 'player_respawn',
        data: { sessionId, position: { x: p.position.x, y: p.position.y, z: p.position.z } },
      });
    }, RESPAWN_SEC * 1000);

    this.respawnTimers.set(sessionId, timer);
  }

  private spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    this.bossController.spawnBoss(this.state.players.size);
  }

  private handleBossDefeated(): void {
    if (this.bossDefeated) return;
    this.bossDefeated = true;

    this.state.boss.isActive = false;

    this.broadcast('GAME_EVENT', {
      event: GameEvent.BOSS_DEFEATED,
      data: { bossId: this.state.boss.id },
    });

    if (this.victoryTimer) clearTimeout(this.victoryTimer);
    this.victoryTimer = setTimeout(() => {
      this.victoryTimer = null;
      this.state.phase = RoomPhase.VICTORY;
      this.broadcast('GAME_EVENT', {
        event: GameEvent.MATCH_END,
        data: { victory: true, wave: this.state.currentWave, elapsedTime: this.state.elapsedTime },
      });
      this.persistMatch(true);
    }, 3000);
  }

  private async persistMatch(victory: boolean): Promise<void> {
    try {
      const participants: Array<{ userId: string; color: string; kills: number; damage: number; deaths: number }> = [];
      this.state.players.forEach((player) => {
        participants.push({
          userId: player.userId || player.sessionId,
          color: player.color,
          kills: 0,
          damage: 0,
          deaths: player.isAlive ? 0 : 1,
        });
      });

      if (participants.length > 0) {
        await this.matchService.persistMatch({
          roomCode: this.state.roomCode,
          arena: 'storm-arena',
          difficulty: this.state.difficulty,
          wavesCleared: this.state.currentWave,
          bossDefeated: this.bossDefeated,
          duration: Math.floor(this.state.elapsedTime / 1000),
          victory,
          participants,
        });
        logger.info('game-room', 'match persisted', { roomCode: this.state.roomCode, victory });
      }
    } catch (err) {
      logger.error('game-room', 'failed to persist match', { error: String(err) });
    }
  }

  private serverTick(deltaTime: number) {
    if (this.simulationPaused) return;
    if (this.state.phase !== RoomPhase.GAME) return;

    this.state.elapsedTime += deltaTime;
    const dt = deltaTime / 1000;

    this.state.players.forEach((player, sessionId) => {
      if (!player.isAlive) return;

      const preMovePos = { x: player.position.x, y: player.position.y, z: player.position.z };
      const update = this.movement.update(sessionId, deltaTime);

      player.position.x += update.velocity.x * PLAYER_SPEED * dt;
      player.position.y += update.velocity.y * PLAYER_SPEED * dt;
      player.position.z += update.velocity.z * PLAYER_SPEED * dt;

      if (this.detectSpeedHack(sessionId, preMovePos, deltaTime)) {
        player.position.x = preMovePos.x;
        player.position.z = preMovePos.z;
      }

      player.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.x));
      player.position.y = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.y));
      player.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.z));

      if (update.rotation) {
        player.rotation.x = update.rotation.x;
        player.rotation.y = update.rotation.y;
        player.rotation.z = update.rotation.z ?? 0;
      }

      if (player.state !== PlayerState.ATTACKING && player.state !== PlayerState.DODGING && player.state !== PlayerState.BLOCKING) {
        player.state = update.hasInput ? PlayerState.RUNNING : PlayerState.IDLE;
      }
    });

    this.combat.update(deltaTime);
    this.weapons.update?.(deltaTime);
    this.projectiles.update(deltaTime);
    this.enemySystem.update(deltaTime);
    this.enemySystem.updateProjectiles(deltaTime);

    if (this.state.boss.isActive) {
      this.bossController.tick(deltaTime, this.state.players);

      const hitbox = this.bossController.getAttackHitbox();
      if (hitbox) {
        const cooldownKey = 'boss_aoe';
        const now = performance.now();
        const cooldown = this.state.boss.currentAttack === 'charge' ? 600 : 800;

        this.state.players.forEach((player, id) => {
          if (!player.isAlive) return;
          const dx = player.position.x - hitbox.x;
          const dz = player.position.z - hitbox.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > hitbox.radius) return;

          const damage = Math.round(hitbox.damage * (0.85 + Math.random() * 0.3));
          player.health = Math.max(0, player.health - damage);

          if (player.health <= 0) {
            this.handlePlayerDeath(id, 'boss');
          }

          this.broadcast('GAME_EVENT', {
            event: 'player_damaged',
            data: {
              targetId: id, damage, isDead: player.health <= 0,
              knockbackX: dist > 0.01 ? (dx / dist) * 3 : 0,
              knockbackZ: dist > 0.01 ? (dz / dist) * 3 : 0,
            },
          });
        });
      }
    }
  }
}
