import { create } from 'zustand'
import {
  RoomPhase,
  Difficulty,
  PlayerColor,
  WeaponType,
  BossPhase,
  ConnectionStatus,
  type GameStateData,
  type PlayerData,
  type MatchStatsData,
} from '@storm-arena/shared'

export interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  username: string | null
  email: string | null
  token: string | null
}

export interface ConnectionState {
  status: ConnectionStatus
  serverUrl: string | null
  roomId: string | null
}

export interface LobbyState {
  roomCode: string
  players: Record<string, PlayerData>
  difficulty: Difficulty
  hostId: string
}

export interface UIState {
  isLoading: boolean
  loadingMessage: string
  error: string | null
  modalOpen: boolean
  modalContent: string | null
}

export interface SettingsState {
  musicVolume: number
  sfxVolume: number
  masterVolume: number
  graphicsQuality: 'low' | 'medium' | 'high'
}

export interface ProfileState {
  level: number
  xp: number
  xpToNext: number
  coins: number
  wins: number
  losses: number
  totalKills: number
  totalDamage: number
}

export interface GameUIState {
  showWaveTransition: boolean
  waveNumber: number
  waveComplete: boolean
  showBossHealth: boolean
  bossHealth: number
  bossMaxHealth: number
  bossPhase: BossPhase
  bossEnraged: boolean
  bossDefeated: boolean
  victory: boolean
  matchStats: MatchStatsData | null
  localPlayerDead: boolean
  respawnTimer: number
  phaseTransitionMessage: string | null
  weaponRespawnMessage: string | null
}

export interface GameStore {
  auth: AuthState
  connection: ConnectionState
  lobby: LobbyState
  ui: UIState
  settings: SettingsState
  profile: ProfileState
  gameUI: GameUIState
  gameState: GameStateData | null
  isMatchActive: boolean
  localPlayerId: string | null

  setAuth: (auth: Partial<AuthState>) => void
  logout: () => void
  setConnection: (connection: Partial<ConnectionState>) => void
  setLobby: (lobby: Partial<LobbyState>) => void
  setUI: (ui: Partial<UIState>) => void
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string | null) => void
  setSettings: (settings: Partial<SettingsState>) => void
  setProfile: (profile: Partial<ProfileState>) => void
  setGameUI: (gameUI: Partial<GameUIState>) => void
  setGameState: (state: GameStateData | null) => void
  setMatchActive: (active: boolean) => void
  setLocalPlayerId: (sessionId: string | null) => void
  resetGameUI: () => void
  resetLobby: () => void
}

const defaultSettings: SettingsState = {
  musicVolume: 70,
  sfxVolume: 80,
  masterVolume: 100,
  graphicsQuality: 'medium',
}

const defaultProfile: ProfileState = {
  level: 1,
  xp: 0,
  xpToNext: 100,
  coins: 0,
  wins: 0,
  losses: 0,
  totalKills: 0,
  totalDamage: 0,
}

const defaultGameUI: GameUIState = {
  showWaveTransition: false,
  waveNumber: 0,
  waveComplete: false,
  showBossHealth: false,
  bossHealth: 0,
  bossMaxHealth: 500,
  bossPhase: BossPhase.PHASE_1,
  bossEnraged: false,
  bossDefeated: false,
  victory: false,
  matchStats: null,
  localPlayerDead: false,
  respawnTimer: 0,
  phaseTransitionMessage: null,
  weaponRespawnMessage: null,
}

const defaultLobby: LobbyState = {
  roomCode: '',
  players: {},
  difficulty: Difficulty.NORMAL,
  hostId: '',
}

export const useGameStore = create<GameStore>((set) => ({
  auth: {
    isAuthenticated: false,
    userId: null,
    username: null,
    email: null,
    token: null,
  },
  connection: {
    status: ConnectionStatus.DISCONNECTED,
    serverUrl: null,
    roomId: null,
  },
  lobby: { ...defaultLobby },
  ui: {
    isLoading: false,
    loadingMessage: '',
    error: null,
    modalOpen: false,
    modalContent: null,
  },
  settings: { ...defaultSettings },
  profile: { ...defaultProfile },
  gameUI: { ...defaultGameUI },
  gameState: null,
  isMatchActive: false,
  localPlayerId: null,

  setAuth: (auth) =>
    set((state) => ({ auth: { ...state.auth, ...auth } })),

  logout: () =>
    set({
      auth: {
        isAuthenticated: false,
        userId: null,
        username: null,
        email: null,
        token: null,
      },
    }),

  setConnection: (connection) =>
    set((state) => ({ connection: { ...state.connection, ...connection } })),

  setLobby: (lobby) =>
    set((state) => ({ lobby: { ...state.lobby, ...lobby } })),

  setUI: (ui) =>
    set((state) => ({ ui: { ...state.ui, ...ui } })),

  setLoading: (loading, message = '') =>
    set((state) => ({
      ui: { ...state.ui, isLoading: loading, loadingMessage: message },
    })),

  setError: (error) =>
    set((state) => ({
      ui: { ...state.ui, error },
    })),

  setSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),

  setProfile: (profile) =>
    set((state) => ({ profile: { ...state.profile, ...profile } })),

  setGameUI: (gameUI) =>
    set((state) => ({ gameUI: { ...state.gameUI, ...gameUI } })),

  setGameState: (state) => set({ gameState: state }),

  setMatchActive: (active) => set({ isMatchActive: active }),

  setLocalPlayerId: (sessionId) => set({ localPlayerId: sessionId }),

  resetGameUI: () => set({ gameUI: { ...defaultGameUI } }),

  resetLobby: () =>
    set({
      lobby: { ...defaultLobby },
      gameState: null,
      isMatchActive: false,
      gameUI: { ...defaultGameUI },
      localPlayerId: null,
    }),
}))
