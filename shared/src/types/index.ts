export enum PlayerState {
  IDLE = 'idle',
  RUNNING = 'running',
  ATTACKING = 'attacking',
  DODGING = 'dodging',
  BLOCKING = 'blocking',
  STAGGERED = 'staggered',
  DEAD = 'dead',
}

export enum EnemyState {
  IDLE = 'idle',
  DETECT = 'detect',
  CHASE = 'chase',
  ATTACK = 'attack',
  RECOVER = 'recover',
  STAGGER = 'stagger',
  KNOCKBACK = 'knockback',
  DEAD = 'dead',
}

export enum BossPhase {
  PHASE_1 = 'phase_1',
  PHASE_2 = 'phase_2',
  PHASE_3 = 'phase_3',
  ENRAGED = 'enraged',
}

export enum BossAttack {
  HEAVY_PUNCH = 'heavy_punch',
  SWEEP = 'sweep',
  CHARGE = 'charge',
  SLAM = 'slam',
  ROAR = 'roar',
  SPIN_ATTACK = 'spin_attack',
  GRAB_THROW = 'grab_throw',
}

export enum RoomPhase {
  LOBBY = 'lobby',
  STARTING = 'starting',
  GAME = 'game',
  VICTORY = 'victory',
  GAME_OVER = 'game_over',
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
}

export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
}

export enum PlayerColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
}

export enum WeaponType {
  FIST = 'fist',
  STICK = 'stick',
  BASEBALL_BAT = 'baseball_bat',
  AXE = 'axe',
  HAMMER = 'hammer',
  ROCK = 'rock',
}

export enum AttackType {
  LIGHT = 'light',
  HEAVY = 'heavy',
  POWER = 'power',
}

export enum EnemyType {
  BASIC = 'basic',
  FAST = 'fast',
  HEAVY = 'heavy',
  SHIELD = 'shield',
  RANGED = 'ranged',
  ELITE = 'elite',
}

export enum GameEvent {
  WAVE_START = 'wave_start',
  WAVE_COMPLETE = 'wave_complete',
  BOSS_SPAWN = 'boss_spawn',
  BOSS_PHASE_CHANGE = 'boss_phase_change',
  BOSS_ATTACK = 'boss_attack',
  BOSS_DEFEATED = 'boss_defeated',
  PLAYER_DIED = 'player_died',
  PLAYER_KILLED = 'player_killed',
  WEAPON_PICKUP = 'weapon_pickup',
  WEAPON_DROP = 'weapon_drop',
  MATCH_END = 'match_end',
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Vector3Data = Vec3;

export interface PlayerData {
  id: string;
  sessionId: string;
  color: PlayerColor;
  position: Vector3Data;
  rotation: Vector3Data;
  state: PlayerState;
  health: number;
  maxHealth: number;
  weapon: WeaponType;
  isHost: boolean;
  isAlive: boolean;
  powerAvailable?: boolean;
}

export interface EnemyData {
  id: string;
  type: EnemyType;
  position: Vector3Data;
  rotation: Vector3Data;
  state: EnemyState;
  health: number;
  maxHealth: number;
  targetPlayerId: string | null;
}

export interface BossData {
  id: string;
  position: Vector3Data;
  rotation: Vector3Data;
  health: number;
  maxHealth: number;
  phase: BossPhase;
  currentAttack: BossAttack | null;
  isEnraged: boolean;
  isActive: boolean;
}

export interface WeaponPickupData {
  id: string;
  type: WeaponType;
  position: Vector3Data;
  isAvailable: boolean;
}

export interface GameStateData {
  phase: RoomPhase;
  countdownSeconds?: number;
  players: Record<string, PlayerData>;
  enemies: Record<string, EnemyData>;
  boss: BossData | null;
  weaponPickups: Record<string, WeaponPickupData>;
  currentWave: number;
  maxWaves: number;
  enemiesRemaining: number;
  difficulty: Difficulty;
  roomCode: string;
  hostId: string;
  elapsedTime: number;
}

export interface MatchStatsData {
  matchId: string;
  roomCode: string;
  difficulty: Difficulty;
  duration: number;
  wavesCleared: number;
  bossDefeated: boolean;
  victory: boolean;
  players: Record<string, PlayerMatchStats>;
  timestamp: number;
}

export interface PlayerMatchStats {
  playerId: string;
  color: PlayerColor;
  kills: number;
  damage: number;
  deaths: number;
  xpEarned: number;
}