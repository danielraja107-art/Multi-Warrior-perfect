import { create } from 'zustand';
import {
  PlayerColor,
  PlayerState,
  EnemyState,
  RoomPhase,
  Difficulty,
  WeaponType,
  BossPhase,
} from '@storm-arena/shared';

export interface ClientVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ClientPlayerState {
  sessionId: string;
  color: PlayerColor;
  position: ClientVector3;
  rotation: ClientVector3;
  state: PlayerState;
  health: number;
  maxHealth: number;
  weapon: WeaponType;
  isHost: boolean;
  isAlive: boolean;
  powerAvailable?: boolean;
}

export interface ClientEnemyState {
  id: string;
  type: string;
  position: ClientVector3;
  rotation: ClientVector3;
  state: EnemyState;
  health: number;
  maxHealth: number;
  targetPlayerId: string;
}

export interface ClientBossState {
  id: string;
  position: ClientVector3;
  rotation: ClientVector3;
  health: number;
  maxHealth: number;
  phase: BossPhase;
  currentAttack: string;
  isEnraged: boolean;
  isActive: boolean;
}

export interface ClientWeaponPickupState {
  id: string;
  type: WeaponType;
  position: ClientVector3;
  isAvailable: boolean;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface GameStore {
  connectionStatus: ConnectionStatus;
  connectError: string | null;
  roomCode: string;
  phase: RoomPhase;
  countdownSeconds: number;
  difficulty: Difficulty;
  currentWave: number;
  maxWaves: number;
  enemiesRemaining: number;
  localSessionId: string | null;
  isHost: boolean;
  players: Record<string, ClientPlayerState>;
  enemies: Record<string, ClientEnemyState>;
  boss: ClientBossState | null;
  weaponPickups: Record<string, ClientWeaponPickupState>;
  audioEnabled: boolean;

  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setRoomMeta: (meta: {
    roomCode: string;
    phase: RoomPhase;
    countdownSeconds?: number;
    difficulty: Difficulty;
    currentWave: number;
    maxWaves: number;
    enemiesRemaining: number;
    hostId: string;
    localSessionId: string;
    isHost: boolean;
  }) => void;
  setLocalSessionId: (sessionId: string | null) => void;
  upsertPlayer: (player: ClientPlayerState) => void;
  removePlayer: (sessionId: string) => void;
  clearPlayers: () => void;
  upsertEnemy: (enemy: ClientEnemyState) => void;
  removeEnemy: (id: string) => void;
  clearEnemies: () => void;
  setBoss: (boss: ClientBossState | null) => void;
  upsertWeaponPickup: (pickup: ClientWeaponPickupState) => void;
  removeWeaponPickup: (id: string) => void;
  clearWeaponPickups: () => void;
  setWave: (currentWave: number, maxWaves: number, enemiesRemaining: number) => void;
  setPhase: (phase: RoomPhase) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setAudioEnabled: (enabled: boolean) => void;
  resetMatch: () => void;
}

const initialState = {
  connectionStatus: 'idle' as ConnectionStatus,
  connectError: null as string | null,
  roomCode: '',
  phase: RoomPhase.LOBBY,
  countdownSeconds: 0,
  difficulty: Difficulty.NORMAL,
  currentWave: 0,
  maxWaves: 5,
  enemiesRemaining: 0,
  localSessionId: null as string | null,
  isHost: false,
  players: {} as Record<string, ClientPlayerState>,
  enemies: {} as Record<string, ClientEnemyState>,
  boss: null as ClientBossState | null,
  weaponPickups: {} as Record<string, ClientWeaponPickupState>,
  audioEnabled: true,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnectionStatus: (status, error) =>
    set({ connectionStatus: status, connectError: error ?? null }),

  setRoomMeta: (meta) =>
    set({
      roomCode: meta.roomCode,
      phase: meta.phase,
      countdownSeconds: meta.countdownSeconds ?? 0,
      difficulty: meta.difficulty,
      currentWave: meta.currentWave,
      maxWaves: meta.maxWaves,
      enemiesRemaining: meta.enemiesRemaining,
      localSessionId: meta.localSessionId,
      isHost: meta.isHost,
    }),

  setLocalSessionId: (sessionId) => set({ localSessionId: sessionId }),

  upsertPlayer: (player) =>
    set((state) => ({ players: { ...state.players, [player.sessionId]: player } })),

  removePlayer: (sessionId) =>
    set((state) => {
      const players = { ...state.players };
      delete players[sessionId];
      return { players };
    }),

  clearPlayers: () => set({ players: {} }),

  upsertEnemy: (enemy) =>
    set((state) => ({ enemies: { ...state.enemies, [enemy.id]: enemy } })),

  removeEnemy: (id) =>
    set((state) => {
      const enemies = { ...state.enemies };
      delete enemies[id];
      return { enemies };
    }),

  clearEnemies: () => set({ enemies: {} }),

  setBoss: (boss) => set({ boss }),

  upsertWeaponPickup: (pickup) =>
    set((state) => ({ weaponPickups: { ...state.weaponPickups, [pickup.id]: pickup } })),

  removeWeaponPickup: (id) =>
    set((state) => {
      const weaponPickups = { ...state.weaponPickups };
      delete weaponPickups[id];
      return { weaponPickups };
    }),

  clearWeaponPickups: () => set({ weaponPickups: {} }),

  setWave: (currentWave, maxWaves, enemiesRemaining) =>
    set({ currentWave, maxWaves, enemiesRemaining }),

  setPhase: (phase) => set({ phase }),

  setDifficulty: (difficulty) => set({ difficulty }),

  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),

  resetMatch: () =>
    set({
      phase: RoomPhase.LOBBY,
      currentWave: 0,
      maxWaves: 5,
      enemiesRemaining: 0,
      enemies: {},
      boss: null,
      weaponPickups: {},
    }),
}));

export function toClientPlayer(p: {
  sessionId: string;
  color: string;
  position?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  state?: string;
  health?: number;
  maxHealth?: number;
  weapon?: string;
  isHost?: boolean;
  isAlive?: boolean;
  powerAvailable?: boolean;
}): ClientPlayerState {
  return {
    sessionId: p.sessionId,
    color: (p.color as PlayerColor) || PlayerColor.RED,
    position: { x: p.position?.x ?? 0, y: p.position?.y ?? 0, z: p.position?.z ?? 0 },
    rotation: { x: p.rotation?.x ?? 0, y: p.rotation?.y ?? 0, z: p.rotation?.z ?? 0 },
    state: (p.state as PlayerState) || PlayerState.IDLE,
    health: p.health ?? 100,
    maxHealth: p.maxHealth ?? 100,
    weapon: (p.weapon as WeaponType) || WeaponType.FIST,
    isHost: Boolean(p.isHost),
    isAlive: p.isAlive ?? true,
    powerAvailable: p.powerAvailable ?? true,
  };
}

export function toClientEnemy(e: {
  id: string;
  type?: string;
  position?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  state?: string;
  health?: number;
  maxHealth?: number;
  targetPlayerId?: string;
}): ClientEnemyState {
  return {
    id: e.id,
    type: e.type ?? 'basic',
    position: { x: e.position?.x ?? 0, y: e.position?.y ?? 0, z: e.position?.z ?? 0 },
    rotation: { x: e.rotation?.x ?? 0, y: e.rotation?.y ?? 0, z: e.rotation?.z ?? 0 },
    state: (e.state as EnemyState) || EnemyState.IDLE,
    health: e.health ?? 50,
    maxHealth: e.maxHealth ?? 50,
    targetPlayerId: e.targetPlayerId ?? '',
  };
}

export function toClientBoss(b: {
  id: string;
  position?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  health?: number;
  maxHealth?: number;
  phase?: string;
  currentAttack?: string;
  isEnraged?: boolean;
  isActive?: boolean;
}): ClientBossState {
  return {
    id: b.id,
    position: { x: b.position?.x ?? 0, y: b.position?.y ?? 0, z: b.position?.z ?? 0 },
    rotation: { x: b.rotation?.x ?? 0, y: b.rotation?.y ?? 0, z: b.rotation?.z ?? 0 },
    health: b.health ?? 500,
    maxHealth: b.maxHealth ?? 500,
    phase: (b.phase as BossPhase) || BossPhase.PHASE_1,
    currentAttack: b.currentAttack ?? '',
    isEnraged: Boolean(b.isEnraged),
    isActive: Boolean(b.isActive),
  };
}

export function toClientWeaponPickup(w: {
  id: string;
  type?: string;
  position?: { x?: number; y?: number; z?: number };
  isAvailable?: boolean;
}): ClientWeaponPickupState {
  return {
    id: w.id,
    type: (w.type as WeaponType) || WeaponType.STICK,
    position: { x: w.position?.x ?? 0, y: w.position?.y ?? 0, z: w.position?.z ?? 0 },
    isAvailable: Boolean(w.isAvailable),
  };
}

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  [PlayerColor.RED]: '#e53935',
  [PlayerColor.BLUE]: '#1e88e5',
  [PlayerColor.GREEN]: '#43a047',
  [PlayerColor.YELLOW]: '#fdd835',
};