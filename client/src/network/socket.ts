import { Client, Room, ErrorCode } from 'colyseus.js'
import {
  ConnectionStatus,
  RoomPhase,
  BossPhase,
  GameEvent,
  MESSAGE_SERVER,
  type GameStateData,
  type PlayerData,
  type EnemyData,
  type BossData,
  type WeaponPickupData,
  type MatchStatsData,
} from '@storm-arena/shared'
import { useGameStore } from '../state/useGameStore'
import { reportError } from './telemetry'
import { setActiveRoom } from './commands'
import { attachRoom, detachRoom } from './MessageHandlers'

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'AUTH_FAILED'
  | 'SERVER_ERROR'
  | 'NETWORK_TIMEOUT'
  | 'CONNECTION'
  | 'INVALID_INPUT'
  | 'UNEXPECTED_STATE'

export class RoomError extends Error {
  constructor(
    public code: RoomErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RoomError'
  }
}

const DEFAULT_SERVER_URL = 'ws://localhost:2567'

const STORAGE_KEY_RECONNECTION = 'storm_arena.room.reconnectionToken'
const STORAGE_KEY_ROOM_ID = 'storm_arena.room.roomId'
const STORAGE_KEY_SERVER = 'storm_arena.room.serverUrl'

const e = (import.meta as { env?: { VITE_SERVER_URL?: string } }).env

export function getServerUrl(): string {
  const nodeEnv =
    typeof process !== 'undefined' && process.env?.VITE_SERVER_URL
      ? process.env.VITE_SERVER_URL
      : undefined
  return nodeEnv || e?.VITE_SERVER_URL || DEFAULT_SERVER_URL
}

export function getApiBaseUrl(): string {
  return getServerUrl().replace(/^ws/, 'http').replace(/\/$/, '')
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage.getItem(key)
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(key, value)
}

function clearStorageKey(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.removeItem(key)
}

// ---------------------------------------------------------------------------
// Projections from the raw (reflection-decoded) Colyseus room state into the
// plain shared GameStateData contract used by the client store.
// ---------------------------------------------------------------------------

function toPlayerData(value: any): PlayerData {
  return {
    id: value.id,
    sessionId: value.sessionId,
    color: value.color,
    position: {
      x: value.position?.x ?? 0,
      y: value.position?.y ?? 0,
      z: value.position?.z ?? 0,
    },
    rotation: {
      x: value.rotation?.x ?? 0,
      y: value.rotation?.y ?? 0,
      z: value.rotation?.z ?? 0,
    },
    state: value.state,
    health: value.health,
    maxHealth: value.maxHealth,
    weapon: value.weapon,
    isHost: value.isHost,
    isAlive: value.isAlive,
    powerAvailable: value.powerAvailable !== false,
  }
}

function toEnemyData(value: any): EnemyData {
  return {
    id: value.id,
    type: value.type,
    position: {
      x: value.position?.x ?? 0,
      y: value.position?.y ?? 0,
      z: value.position?.z ?? 0,
    },
    rotation: {
      x: value.rotation?.x ?? 0,
      y: value.rotation?.y ?? 0,
      z: value.rotation?.z ?? 0,
    },
    state: value.state,
    health: value.health,
    maxHealth: value.maxHealth,
    targetPlayerId: value.targetPlayerId || null,
  }
}

function toBossData(value: any): BossData | null {
  if (!value || !value.isActive) return null
  return {
    id: value.id,
    position: {
      x: value.position?.x ?? 0,
      y: value.position?.y ?? 0,
      z: value.position?.z ?? 0,
    },
    rotation: {
      x: value.rotation?.x ?? 0,
      y: value.rotation?.y ?? 0,
      z: value.rotation?.z ?? 0,
    },
    health: value.health,
    maxHealth: value.maxHealth,
    phase: value.phase,
    currentAttack: value.currentAttack || null,
    isEnraged: value.isEnraged,
    isActive: value.isActive,
  }
}

function toWeaponPickupData(value: any): WeaponPickupData {
  return {
    id: value.id,
    type: value.type,
    position: {
      x: value.position?.x ?? 0,
      y: value.position?.y ?? 0,
      z: value.position?.z ?? 0,
    },
    isAvailable: value.isAvailable,
  }
}

function projectState(state: any): GameStateData {
  const players: Record<string, PlayerData> = {}
  const enemies: Record<string, EnemyData> = {}
  const weaponPickups: Record<string, WeaponPickupData> = {}

  if (state.players) state.players.forEach((value: any) => (players[value.sessionId] = toPlayerData(value)))
  if (state.enemies) state.enemies.forEach((value: any) => (enemies[value.id] = toEnemyData(value)))
  if (state.weaponPickups) state.weaponPickups.forEach((value: any) => (weaponPickups[value.id] = toWeaponPickupData(value)))

  return {
    phase: state.phase,
    countdownSeconds: state.countdownSeconds ?? 0,
    players,
    enemies,
    boss: toBossData(state.boss),
    weaponPickups,
    currentWave: state.currentWave,
    maxWaves: state.maxWaves,
    enemiesRemaining: state.enemiesRemaining,
    difficulty: state.difficulty,
    roomCode: state.roomCode,
    hostId: state.hostId,
    elapsedTime: state.elapsedTime,
  }
}

// ---------------------------------------------------------------------------
// Store consumption
// ---------------------------------------------------------------------------

function pushLobbyFromState(gameState: GameStateData) {
  useGameStore.getState().setLobby({
    roomCode: gameState.roomCode,
    players: gameState.players,
    difficulty: gameState.difficulty,
    hostId: gameState.hostId,
  })
  useGameStore.getState().setMatchActive(gameState.phase === RoomPhase.GAME)
}

function pushGameState(state: any) {
  const gameState = projectState(state)
  const store = useGameStore.getState()
  store.setGameState(gameState)

  if (
    gameState.phase === RoomPhase.LOBBY ||
    gameState.phase === RoomPhase.STARTING ||
    gameState.phase === RoomPhase.GAME
  ) {
    pushLobbyFromState(gameState)
  }

  const local = gameState.players[store.localPlayerId ?? '']
  if (local && !local.isAlive) {
    store.setGameUI({ localPlayerDead: true })
  } else if (local && local.isAlive) {
    store.setGameUI({ localPlayerDead: false })
  }

  if (gameState.boss) {
    store.setGameUI({
      showBossHealth: true,
      bossHealth: gameState.boss.health,
      bossMaxHealth: gameState.boss.maxHealth,
      bossPhase: gameState.boss.phase,
      bossEnraged: gameState.boss.isEnraged,
    })
  }
}

const BOSS_PHASE_LABELS: Record<string, string> = {
  [BossPhase.PHASE_1]: 'PHASE 1',
  [BossPhase.PHASE_2]: 'PHASE 2',
  [BossPhase.PHASE_3]: 'PHASE 3',
  [BossPhase.ENRAGED]: 'ENRAGED',
}

function handleGameEvent(payload: { event: string; data?: Record<string, unknown> }) {
  const store = useGameStore.getState()
  const { event, data } = payload

  switch (event) {
    case GameEvent.WAVE_START:
      store.setGameUI({
        showWaveTransition: true,
        waveComplete: false,
        waveNumber: Number(data?.wave ?? store.gameUI.waveNumber),
        weaponRespawnMessage:
          typeof data?.weaponRespawnIn === 'number'
            ? `Weapons respawn in ${data.weaponRespawnIn}s`
            : null,
      })
      break
    case GameEvent.WAVE_COMPLETE:
      store.setGameUI({
        showWaveTransition: true,
        waveComplete: true,
        weaponRespawnMessage:
          typeof data?.weaponRespawnIn === 'number'
            ? `Weapons respawn in ${data.weaponRespawnIn}s`
            : null,
      })
      break
    case GameEvent.BOSS_SPAWN:
      store.setGameUI({
        showBossHealth: true,
        bossPhase: (data?.phase as BossPhase) ?? store.gameUI.bossPhase,
        phaseTransitionMessage: 'A NEW THREAT APPROACHES',
      })
      break
    case GameEvent.BOSS_PHASE_CHANGE:
      store.setGameUI({
        showBossHealth: true,
        bossPhase: (data?.phase as BossPhase) ?? store.gameUI.bossPhase,
        phaseTransitionMessage: data?.phase
          ? `BOSS ${BOSS_PHASE_LABELS[data.phase as string] ?? String(data.phase)}`
          : 'BOSS PHASE CHANGED',
      })
      break
    case GameEvent.BOSS_DEFEATED:
      store.setGameUI({ bossDefeated: true, showBossHealth: true })
      break
    case GameEvent.PLAYER_DIED:
      if (data?.sessionId === store.localPlayerId || !data?.sessionId) {
        store.setGameUI({
          localPlayerDead: true,
          respawnTimer: typeof data?.respawnIn === 'number' ? data.respawnIn : 0,
        })
      }
      break
    case GameEvent.PLAYER_KILLED:
      if (data?.sessionId === store.localPlayerId) {
        store.setGameUI({ localPlayerDead: false })
      }
      break
    case GameEvent.WEAPON_PICKUP:
      store.setGameUI({
        weaponRespawnMessage: `Picked up ${String(data?.weapon ?? 'a weapon')}`,
      })
      break
    case GameEvent.WEAPON_DROP:
      store.setGameUI({
        weaponRespawnMessage: `Weapons respawn in ${
          typeof data?.respawnIn === 'number' ? data.respawnIn : 10
        }s`,
      })
      break
    case GameEvent.MATCH_END:
      store.setGameUI({
        victory: Boolean(data?.victory),
        matchStats: (data?.stats as MatchStatsData | undefined) ?? null,
        showWaveTransition: false,
      })
      break
  }
}

// ---------------------------------------------------------------------------
// Client / room lifecycle
// ---------------------------------------------------------------------------

let client: Client | null = null
let currentRoom: Room<any> | null = null

function getClient(): Client {
  if (!client) {
    client = new Client(getServerUrl())
  }
  return client
}

function persistSession(roomId: string, reconnectionToken: string) {
  writeStorage(STORAGE_KEY_ROOM_ID, roomId)
  writeStorage(STORAGE_KEY_RECONNECTION, reconnectionToken)
  writeStorage(STORAGE_KEY_SERVER, getServerUrl())
}

function clearSession() {
  clearStorageKey(STORAGE_KEY_ROOM_ID)
  clearStorageKey(STORAGE_KEY_RECONNECTION)
}

function bindRoom(room: Room<any>) {
  currentRoom = room
  setActiveRoom(room)
  attachRoom(room, room.sessionId)
  const store = useGameStore.getState()
  store.setConnection({
    status: ConnectionStatus.CONNECTED,
    roomId: room.roomId,
    serverUrl: getServerUrl(),
  })
  store.setLocalPlayerId(room.sessionId)
  persistSession(room.roomId, room.reconnectionToken)

  room.onStateChange((state) => {
    pushGameState(state)
  })

  room.onMessage(MESSAGE_SERVER.GAME_EVENT, (payload) => {
    handleGameEvent(payload as { event: string; data?: Record<string, unknown> })
  })

  room.onMessage(MESSAGE_SERVER.ERROR, (payload) => {
    const msg = payload as { code?: string; message?: string }
    useGameStore
      .getState()
      .setError(msg.message ?? msg.code ?? 'The server reported an error.')
  })

  room.onError((code, message) => {
    const mapped = mapServerError(code, message)
    if (mapped) {
      useGameStore.getState().setError(mapped.message)
    }
    reportError('network', message ?? `socket error ${String(code)}`, 'room.onError')
  })

  room.onLeave((code) => {
    setActiveRoom(null)
    detachRoom()
    const store = useGameStore.getState()
    const hadLiveSession =
      Boolean(store.connection.roomId) && store.localPlayerId != null && store.localPlayerId === room.sessionId
    store.setConnection({ status: ConnectionStatus.DISCONNECTED, roomId: null })
    store.setLocalPlayerId(null)

    if (hadLiveSession && typeof code === 'number' && code !== 1000 && code !== 0) {
      store.setConnection({ status: ConnectionStatus.RECONNECTING })
    } else {
      store.resetLobby()
    }
  })
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapServerError(code: number | undefined, message?: string): RoomError | null {
  if (code === undefined) return null
  switch (code) {
    case ErrorCode.MATCHMAKE_INVALID_ROOM_ID:
    case ErrorCode.MATCHMAKE_INVALID_CRITERIA:
    case ErrorCode.MATCHMAKE_NO_HANDLER:
      return new RoomError('ROOM_NOT_FOUND', message?.includes('room')
        ? message
        : 'Room not found. Please check the code and try again.')
    case ErrorCode.AUTH_FAILED:
      return new RoomError('AUTH_FAILED', 'Authentication failed while connecting to the room.')
    case ErrorCode.MATCHMAKE_EXPIRED:
      return new RoomError('SERVER_ERROR', 'Your room session has expired.')
    case ErrorCode.APPLICATION_ERROR: {
      const text = (message ?? '').toLowerCase()
      if (text.includes('full') || text.includes('locked')) {
        return new RoomError('ROOM_FULL', 'This room is full. Try another code.')
      }
      return new RoomError('SERVER_ERROR', message ?? 'The game server rejected the request.')
    }
    default:
      return new RoomError('SERVER_ERROR', message ?? 'Unexpected server error.')
  }
}

function normalizeError(err: unknown): RoomError {
  if (err instanceof RoomError) return err

  const anyErr = err as { code?: number | string; message?: string }
  const message = anyErr?.message || String(err)

  const mapped = mapServerError(
    typeof anyErr?.code === 'number' ? anyErr.code : undefined,
    anyErr?.message,
  )
  if (mapped) return mapped

  if (message.toLowerCase().includes('timed') || message.toLowerCase().includes('timeout')) {
    return new RoomError('NETWORK_TIMEOUT', 'Connection to the game server timed out.')
  }
  if (
    message.toLowerCase().includes('couldn') ||
    message.toLowerCase().includes('refused') ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('socket')
  ) {
    return new RoomError(
      'CONNECTION',
      'Could not reach the game server. Please check that it is online and try again.',
    )
  }
  return new RoomError('SERVER_ERROR', message)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RoomError('NETWORK_TIMEOUT', `Timed out while ${what}.`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function lookupRoomStatus(code: string) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/game-rooms/status?code=${encodeURIComponent(code)}`)
    if (!res.ok) return null
    const body = (await res.json()) as {
      found?: boolean
      rooms?: { roomId: string; clients: number; maxClients: number; locked: boolean }[]
    }
    return body
  } catch {
    return null
  }
}

export async function createRoom(difficulty?: string): Promise<Room<any>> {
  const store = useGameStore.getState()
  store.setConnection({ status: ConnectionStatus.CONNECTING })
  store.setError(null)

  try {
    const room = await withTimeout(
      getClient().create('game_room', { difficulty }),
      10000,
      'creating the room',
    )
    bindRoom(room)
    return room
  } catch (err) {
    store.setConnection({ status: ConnectionStatus.DISCONNECTED })
    throw normalizeError(err)
  }
}

export async function joinRoom(code: string): Promise<Room<any>> {
  const normalized = String(code ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) {
    throw new RoomError('INVALID_INPUT', 'Please enter a valid room code.')
  }

  const store = useGameStore.getState()
  store.setConnection({ status: ConnectionStatus.CONNECTING })
  store.setError(null)

  try {
    // The lobby screen displays the 4-character room code; the live room must
    // be resolved to its network room id via the server's room listing.
    let listed = await withTimeout(
      getClient().getAvailableRooms('game_room'),
      10000,
      'searching for the room',
    )

    if (!listed.length) {
      listed = await withTimeout(
        getClient().getAvailableRooms('game_room'),
      6000,
        'searching for the room',
      )
    }

    const match = listed.find(
      (room) => (room.metadata as { code?: string } | undefined)?.code === normalized,
    )
    if (!match) {
      const status = await lookupRoomStatus(normalized)
      if (status?.found && status.rooms?.length) {
        const room = status.rooms[0]
        if (room.locked || room.clients >= room.maxClients) {
          throw new RoomError(
            'ROOM_FULL',
            'This room is full. Try another code or start a new match.',
          )
        }
      }
      throw new RoomError(
        'ROOM_NOT_FOUND',
        'Room not found. Please check the code and try again.',
      )
    }

    const room = await withTimeout(
      getClient().joinById(match.roomId, {}),
      10000,
      'joining the room',
    )
    bindRoom(room)
    return room
  } catch (err) {
    store.setConnection({ status: ConnectionStatus.DISCONNECTED })
    throw normalizeError(err)
  }
}

export async function leaveRoom(): Promise<void> {
  const room = currentRoom
  currentRoom = null
  setActiveRoom(null)
  detachRoom()
  clearSession()
  const store = useGameStore.getState()
  store.setConnection({ status: ConnectionStatus.DISCONNECTED, roomId: null })
  store.setLocalPlayerId(null)
  store.resetLobby()
  if (room) {
    try {
      await room.leave()
    } catch {
      // ignore leave errors
    }
  }
}

export async function reconnect(): Promise<Room<any>> {
  const stored = readStorage(STORAGE_KEY_RECONNECTION)
  const token = stored || (currentRoom && (currentRoom as { reconnectionToken?: string }).reconnectionToken) || null
  if (!token) {
    throw new RoomError('SERVER_ERROR', 'No previous room session to reconnect to.')
  }

  const store = useGameStore.getState()
  store.setConnection({ status: ConnectionStatus.RECONNECTING })
  store.setError(null)

  try {
    const room = await withTimeout(getClient().reconnect(token), 10000, 'reconnecting')
    bindRoom(room)
    return room
  } catch (err) {
    clearSession()
    store.setConnection({ status: ConnectionStatus.DISCONNECTED })
    throw normalizeError(err)
  }
}

export function startGame(): void {
  const room = currentRoom
  if (!room) throw new RoomError('SERVER_ERROR', 'You are not in a room.')
  room.send('HOST_START', {})
}

export function changeDifficulty(difficulty: string): void {
  const room = currentRoom
  if (!room) throw new RoomError('SERVER_ERROR', 'You are not in a room.')
  room.send('HOST_CHANGE_DIFFICULTY', { difficulty })
}

export function getCurrentRoom(): Room<any> | null {
  return currentRoom
}