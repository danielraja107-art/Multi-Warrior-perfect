import { Room } from 'colyseus';
import { GameState, Difficulty, EnemyType, GameEvent } from '@storm-arena/shared';
import { EnemySystem } from '../enemies/EnemySystem';
import { WeaponSystem } from '../weapons/WeaponSystem';
import { BossController } from '../bosses/BossController';

interface RoomWithPause {
  simulationPaused: boolean;
}

export interface WaveConfig {
  wave: number;
  enemyBudget: number;
  enemyTypes: EnemyType[];
  spawnIntervalMs: number;
  isBossWave: boolean;
}

export class WaveDirector {
  private room: Room<GameState>;
  private enemySystem: EnemySystem;
  private weaponSystem: WeaponSystem;
  private bossController: BossController;
  private currentWave = 0;
  private maxWaves = 10;
  private difficulty: Difficulty = Difficulty.NORMAL;
  private isResting = false;
  private restTimer: NodeJS.Timeout | null = null;
  private waveConfigs: Map<number, WaveConfig> = new Map();
  private activeSpawnTimers: NodeJS.Timeout[] = [];

  constructor(room: Room<GameState>, enemySystem: EnemySystem, weaponSystem: WeaponSystem, bossController?: BossController) {
    this.room = room;
    this.enemySystem = enemySystem;
    this.weaponSystem = weaponSystem;
    this.bossController = bossController ?? new BossController(room);
    this.initializeWaveConfigs();
  }

  private initializeWaveConfigs(): void {
    this.waveConfigs.set(1, {
      wave: 1, enemyBudget: 3,
      enemyTypes: [EnemyType.BASIC], spawnIntervalMs: 1000, isBossWave: false,
    });
    this.waveConfigs.set(2, {
      wave: 2, enemyBudget: 5,
      enemyTypes: [EnemyType.BASIC, EnemyType.FAST], spawnIntervalMs: 1200, isBossWave: false,
    });
    this.waveConfigs.set(3, {
      wave: 3, enemyBudget: 7,
      enemyTypes: [EnemyType.BASIC, EnemyType.FAST, EnemyType.HEAVY], spawnIntervalMs: 1000, isBossWave: false,
    });
    this.waveConfigs.set(4, {
      wave: 4, enemyBudget: 8,
      enemyTypes: [EnemyType.BASIC, EnemyType.FAST, EnemyType.HEAVY, EnemyType.SHIELD], spawnIntervalMs: 900, isBossWave: false,
    });
    this.waveConfigs.set(5, {
      wave: 5, enemyBudget: 10,
      enemyTypes: [EnemyType.BASIC, EnemyType.FAST, EnemyType.HEAVY, EnemyType.SHIELD, EnemyType.RANGED], spawnIntervalMs: 800, isBossWave: false,
    });
    this.waveConfigs.set(6, {
      wave: 6, enemyBudget: 12,
      enemyTypes: [EnemyType.FAST, EnemyType.HEAVY, EnemyType.SHIELD, EnemyType.RANGED, EnemyType.ELITE], spawnIntervalMs: 700, isBossWave: false,
    });
    this.waveConfigs.set(7, {
      wave: 7, enemyBudget: 14,
      enemyTypes: [EnemyType.BASIC, EnemyType.HEAVY, EnemyType.SHIELD, EnemyType.RANGED, EnemyType.ELITE], spawnIntervalMs: 600, isBossWave: false,
    });
    this.waveConfigs.set(8, {
      wave: 8, enemyBudget: 16,
      enemyTypes: [EnemyType.FAST, EnemyType.HEAVY, EnemyType.RANGED, EnemyType.ELITE], spawnIntervalMs: 500, isBossWave: false,
    });
    this.waveConfigs.set(9, {
      wave: 9, enemyBudget: 18,
      enemyTypes: [EnemyType.HEAVY, EnemyType.SHIELD, EnemyType.RANGED, EnemyType.ELITE], spawnIntervalMs: 400, isBossWave: false,
    });
    this.waveConfigs.set(10, {
      wave: 10, enemyBudget: 1,
      enemyTypes: [EnemyType.ELITE], spawnIntervalMs: 0, isBossWave: true,
    });
  }

  startGame(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.currentWave = 0;
    this.room.state.maxWaves = this.maxWaves;
    this.room.state.difficulty = difficulty;
    this.enemySystem.setWave(1, difficulty);
  }

  startNextWave(): void {
    if (this.currentWave >= this.maxWaves) {
      this.room.state.phase = 'victory';
      this.room.broadcast('GAME_EVENT', {
        event: GameEvent.MATCH_END,
        data: { victory: true },
      });
      return;
    }
    if (this.isResting) return;

    this.currentWave++;
    const config = this.waveConfigs.get(this.currentWave);
    if (!config) return;

    this.enemySystem.setWave(this.currentWave, this.difficulty);
    this.room.state.currentWave = this.currentWave;
    this.room.state.phase = 'game';

    this.enemySystem.clearAll();
    this.weaponSystem.startWave(this.currentWave);

    this.room.state.players.forEach((player) => {
      if (player.isAlive) {
        player.powerAvailable = true;
      }
    });

    this.spawnWave(config);
  }

  private spawnWave(config: WaveConfig): void {
    if (config.isBossWave) {
      this.spawnBoss();
      return;
    }

    const enemyCount = this.calculateEnemyCount(config);
    this.room.state.enemiesRemaining = enemyCount;

    for (let i = 0; i < enemyCount; i++) {
      const type = config.enemyTypes[i % config.enemyTypes.length];
      this.enemySystem.spawnEnemy(type);
    }

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.WAVE_START,
      data: { wave: config.wave, enemyCount, spawnDurationMs: 0 },
    });
  }

  private calculateEnemyCount(config: WaveConfig): number {
    const baseCount = config.enemyBudget;
    const playerCount = this.room.state.players.size;
    const playerMult = 1 + (playerCount - 1) * 0.5;
    const diffMult = this.getDifficultyMultiplier(this.difficulty);
    return Math.round(baseCount * playerMult * diffMult);
  }

  private getDifficultyMultiplier(difficulty: Difficulty): number {
    switch (difficulty) {
      case Difficulty.EASY: return 0.8;
      case Difficulty.NORMAL: return 1.0;
      case Difficulty.HARD: return 1.3;
      default: return 1.0;
    }
  }

  private spawnBoss(): void {
    this.enemySystem.clearAll();
    this.room.state.enemiesRemaining = 0;
    this.room.state.currentWave = this.currentWave;
    this.bossController.spawnBoss(this.room.state.players.size);
    this.room.state.phase = 'game';
  }

  onEnemyDeath(): void {
    this.checkWaveComplete();
  }

  private checkWaveComplete(): void {
    if (this.room.state.enemiesRemaining === 0 && this.currentWave > 0 && !this.isResting) {
      this.startRestPeriod();
    }
  }

  private startRestPeriod(): void {
    this.isResting = true;
    this.room.state.phase = 'lobby';

    this.healPlayers();
    this.weaponSystem.startWave(this.currentWave + 1);

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.WAVE_COMPLETE,
      data: { wave: this.currentWave, weaponRespawnIn: 10 },
    });

    this.restTimer = setTimeout(() => {
      this.isResting = false;
      this.startNextWave();
    }, 10000);
  }

  private healPlayers(): void {
    this.room.state.players.forEach((player) => {
      if (player.isAlive) {
        player.health = Math.min(player.maxHealth, player.health + 20);
      }
    });
  }

  private startNextWaveInternal(): void {
    if (this.currentWave >= this.maxWaves) {
      this.room.state.phase = 'victory';
      this.room.broadcast('GAME_EVENT', {
        event: GameEvent.MATCH_END,
        data: { victory: true },
      });
      return;
    }

    const config = this.waveConfigs.get(this.currentWave + 1);
    if (!config) return;

    this.currentWave++;
    const waveConfig = this.waveConfigs.get(this.currentWave);
    if (!waveConfig) return;

    this.room.state.currentWave = this.currentWave;
    this.room.state.phase = 'game';
    this.room.state.enemiesRemaining = 0;

    this.enemySystem.clearAll();
    this.weaponSystem.startWave(this.currentWave);

    this.room.state.players.forEach((player) => {
      if (player.isAlive) {
        player.powerAvailable = true;
      }
    });

    this.spawnWave(waveConfig);
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.room.state.difficulty = difficulty;
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  getMaxWaves(): number {
    return this.maxWaves;
  }

  isInRestPeriod(): boolean {
    return this.isResting;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  forceRestPeriod(): void {
    if (!this.isResting) {
      this.startRestPeriod();
    }
  }

  skipRestPeriod(): void {
    if (this.isResting && this.restTimer) {
      clearTimeout(this.restTimer);
      this.isResting = false;
      this.startNextWaveInternal();
    }
  }

  resetWave(): void {
    for (const timer of this.activeSpawnTimers) {
      clearTimeout(timer);
    }
    this.activeSpawnTimers = [];
    this.currentWave = 0;
    this.isResting = false;
    if (this.restTimer) {
      clearTimeout(this.restTimer);
      this.restTimer = null;
    }
  }
}