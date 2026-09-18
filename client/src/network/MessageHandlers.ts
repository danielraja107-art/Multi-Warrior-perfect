import type { Room } from 'colyseus.js';
import {
  MESSAGE_SERVER,
  RoomPhase,
  GameEvent,
  type GameEventPayload,
  type MatchResultPayload,
  type ServerErrorPayload,
} from '@storm-arena/shared';
import { useGameStore, toClientPlayer, toClientEnemy, toClientBoss, toClientWeaponPickup } from '../state/GameStore';
import { playSound } from '../game/audio/AudioManager';
import { emitBurst } from '../game/effects/effectsBus';
import { triggerScreenShake } from '../game/effects/screenShakeBus';

interface ColyseusVector3 {
  x: number;
  y: number;
  z: number;
  onChange?: (cb: () => void) => void;
}

interface ColyseusPlayer {
  sessionId: string;
  color: string;
  position: ColyseusVector3;
  rotation: ColyseusVector3;
  state: string;
  health: number;
  maxHealth: number;
  weapon: string;
  isHost: boolean;
  isAlive: boolean;
  powerAvailable?: boolean;
  onChange?: (cb: () => void) => void;
}

interface ColyseusEnemy {
  id: string;
  type: string;
  position: ColyseusVector3;
  rotation: ColyseusVector3;
  state: string;
  health: number;
  maxHealth: number;
  targetPlayerId: string;
  onChange?: (cb: () => void) => void;
}

interface ColyseusBoss {
  id: string;
  position: ColyseusVector3;
  rotation: ColyseusVector3;
  health: number;
  maxHealth: number;
  phase: string;
  currentAttack: string;
  isEnraged: boolean;
  isActive: boolean;
  onChange?: (cb: () => void) => void;
}

interface ColyseusWeaponPickup {
  id: string;
  type: string;
  position: ColyseusVector3;
  isAvailable: boolean;
  onChange?: (cb: () => void) => void;
}

interface ColyseusState {
  phase: string;
  roomCode: string;
  hostId: string;
  difficulty: string;
  currentWave: number;
  maxWaves: number;
  enemiesRemaining: number;
  players: Map<string, ColyseusPlayer>;
  enemies: Map<string, ColyseusEnemy>;
  boss: ColyseusBoss | null;
  weaponPickups: Map<string, ColyseusWeaponPickup>;
}

let syncRoom: Room | null = null;

/** Reconnect state — tracks the last known room ID for reconnect attempts. */
let lastRoomId: string | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

function bindMeta(state: ColyseusState) {
  const localSessionId = useGameStore.getState().localSessionId;
  const local = localSessionId ? state.players.get(localSessionId) : undefined;
  const localIsHost = !!local?.isHost;

  useGameStore.getState().setRoomMeta({
    roomCode: state.roomCode,
    phase: state.phase as RoomPhase,
    countdownSeconds: (state as any).countdownSeconds ?? 0,
    difficulty: state.difficulty as never,
    currentWave: state.currentWave,
    maxWaves: state.maxWaves,
    enemiesRemaining: state.enemiesRemaining,
    hostId: state.hostId,
    localSessionId: localSessionId ?? '',
    isHost: localIsHost,
  });
}

function applyFullSync(state: ColyseusState) {
  const store = useGameStore.getState();

  store.clearPlayers();
  store.clearEnemies();
  store.clearWeaponPickups();

  state.players.forEach((p) => store.upsertPlayer(toClientPlayer(p as ColyseusPlayer)));
  state.enemies.forEach((e) => store.upsertEnemy(toClientEnemy(e as ColyseusEnemy)));
  state.weaponPickups.forEach((w) =>
    store.upsertWeaponPickup(toClientWeaponPickup(w as ColyseusWeaponPickup)),
  );
  if (state.boss) {
    store.setBoss(toClientBoss(state.boss));
  }

  bindMeta(state);
}

export function attachRoom(room: Room<any>, localSessionId: string) {
  syncRoom = room;
  lastRoomId = room.roomId ?? null;
  reconnectAttempts = 0;

  useGameStore.getState().setLocalSessionId(localSessionId);
  useGameStore.getState().setConnectionStatus('connected');

  const state = room.state as unknown as ColyseusState;
  applyFullSync(state);

  const bindPlayer = (player: ColyseusPlayer) => {
    const sync = () => {
      useGameStore.getState().upsertPlayer(toClientPlayer(player));
    };
    sync();
    if (typeof player.onChange === 'function') player.onChange(sync);
    if (typeof player.position?.onChange === 'function') player.position.onChange(sync);
    if (typeof player.rotation?.onChange === 'function') player.rotation.onChange(sync);
  };

  const players = state.players as unknown as {
    forEach: (cb: (v: ColyseusPlayer, k: string) => void) => void;
    onAdd: (cb: (v: ColyseusPlayer, k: string) => void) => void;
    onRemove: (cb: (v: ColyseusPlayer, k: string) => void) => void;
    onClear?: (cb: () => void) => void;
  };
  players.onAdd((player: ColyseusPlayer) => {
    bindPlayer(player);
  });
  players.onRemove((player: ColyseusPlayer) => {
    useGameStore.getState().removePlayer(player.sessionId);
  });
  if (typeof players.onClear === 'function') players.onClear(() => useGameStore.getState().clearPlayers());
  if (typeof players.forEach === 'function') {
    players.forEach((p) => bindPlayer(p));
  }

  const bindEnemy = (enemy: ColyseusEnemy) => {
    const sync = () => {
      useGameStore.getState().upsertEnemy(toClientEnemy(enemy));
    };
    sync();
    if (typeof enemy.onChange === 'function') enemy.onChange(sync);
    if (typeof enemy.position?.onChange === 'function') enemy.position.onChange(sync);
    if (typeof enemy.rotation?.onChange === 'function') enemy.rotation.onChange(sync);
  };

  const enemies = state.enemies as unknown as {
    forEach: (cb: (v: ColyseusEnemy, k: string) => void) => void;
    onAdd: (cb: (v: ColyseusEnemy, k: string) => void) => void;
    onRemove: (cb: (v: ColyseusEnemy, k: string) => void) => void;
    onClear?: (cb: () => void) => void;
  };
  enemies.onAdd((enemy: ColyseusEnemy) => {
    bindEnemy(enemy);
  });
  enemies.onRemove((enemy: ColyseusEnemy) => {
    useGameStore.getState().removeEnemy(enemy.id);
  });
  if (typeof enemies.onClear === 'function') enemies.onClear(() => useGameStore.getState().clearEnemies());
  if (typeof enemies.forEach === 'function') {
    enemies.forEach((e) => bindEnemy(e));
  }

  const bindWeaponPickup = (w: ColyseusWeaponPickup) => {
    const sync = () => {
      useGameStore.getState().upsertWeaponPickup(toClientWeaponPickup(w));
    };
    sync();
    if (typeof w.onChange === 'function') w.onChange(sync);
    if (typeof w.position?.onChange === 'function') w.position.onChange(sync);
  };

  const weaponPickups = state.weaponPickups as unknown as {
    forEach: (cb: (v: ColyseusWeaponPickup, k: string) => void) => void;
    onAdd: (cb: (v: ColyseusWeaponPickup, k: string) => void) => void;
    onRemove: (cb: (v: ColyseusWeaponPickup, k: string) => void) => void;
    onClear?: (cb: () => void) => void;
  };
  weaponPickups.onAdd((w: ColyseusWeaponPickup) => {
    bindWeaponPickup(w);
  });
  weaponPickups.onRemove((w: ColyseusWeaponPickup) => {
    useGameStore.getState().removeWeaponPickup(w.id);
  });
  if (typeof weaponPickups.onClear === 'function') weaponPickups.onClear(() => useGameStore.getState().clearWeaponPickups());
  if (typeof weaponPickups.forEach === 'function') {
    weaponPickups.forEach((w) => bindWeaponPickup(w));
  }

  if (state.boss) {
    const syncBoss = () => {
      useGameStore.getState().setBoss(toClientBoss(state.boss!));
    };
    syncBoss();
    if (typeof state.boss.onChange === 'function') state.boss.onChange(syncBoss);
    if (typeof state.boss.position?.onChange === 'function') state.boss.position.onChange(syncBoss);
    if (typeof state.boss.rotation?.onChange === 'function') state.boss.rotation.onChange(syncBoss);
  }

  room.onStateChange((latestState) => {
    bindMeta(latestState as ColyseusState);
    const store = useGameStore.getState();
    const st = latestState as unknown as ColyseusState;
    if (st.players && typeof st.players.forEach === 'function') {
      st.players.forEach((p) => store.upsertPlayer(toClientPlayer(p as ColyseusPlayer)));
    }
    if (st.enemies && typeof st.enemies.forEach === 'function') {
      st.enemies.forEach((e) => store.upsertEnemy(toClientEnemy(e as ColyseusEnemy)));
    }
  });

  room.onMessage(MESSAGE_SERVER.STATE_UPDATE, () => {
    applyFullSync(room.state as unknown as ColyseusState);
  });

  room.onMessage(MESSAGE_SERVER.GAME_EVENT, (payload: GameEventPayload) => {
    handleGameEvent(payload);
  });

  room.onMessage(MESSAGE_SERVER.MATCH_RESULT, (_payload: MatchResultPayload) => {
    useGameStore.getState().setPhase(RoomPhase.VICTORY);
  });

  room.onMessage(MESSAGE_SERVER.ERROR, (payload: ServerErrorPayload) => {
    console.error('[server error]', payload.code, payload.message);
  });

  room.onLeave((code: number) => {
    const store = useGameStore.getState();
    // 1000 = normal close, 4000+ = server kicked; 1001/1006 = abnormal disconnect
    const isAbnormal = code !== 1000 && code < 4000;
    if (isAbnormal && lastRoomId && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      store.setConnectionStatus('connecting');
      scheduleReconnect();
    } else {
      store.setConnectionStatus('disconnected');
    }
  });
}

function scheduleReconnect() {
  reconnectAttempts++;
  const delay = RECONNECT_DELAY_MS * reconnectAttempts;
  console.info(`[reconnect] attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
  setTimeout(async () => {
    if (!lastRoomId) return;
    try {
      const { default: Colyseus } = await import('colyseus.js');
      const SERVER_URL =
        (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SERVER_URL ??
        'ws://localhost:2567';
      const client = new Colyseus.Client(SERVER_URL);
      const room = await client.reconnect(lastRoomId);
      attachRoom(room, room.sessionId);
      reconnectAttempts = 0;
      console.info('[reconnect] success');
    } catch (err) {
      console.warn('[reconnect] failed:', err);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect();
      } else {
        useGameStore.getState().setConnectionStatus('disconnected', 'Reconnect failed');
      }
    }
  }, delay);
}

/** Handle player respawn: play sound + emit visual burst at respawn location. */
function handlePlayerRespawn(data: Record<string, unknown>) {
  const store = useGameStore.getState();
  playSound('player_respawn');

  // If the server sends the respawn position, emit a burst there
  if (
    data.position &&
    typeof (data.position as Record<string, number>).x === 'number'
  ) {
    const pos = data.position as { x: number; y: number; z: number };
    emitBurst('spark', [pos.x, pos.y + 0.3, pos.z], {
      color: '#7ff0ff',
      count: 14,
      power: 1.0,
    });
  }

  // Update player alive state from store if available
  const sessionId = data.sessionId as string | undefined;
  if (sessionId) {
    const player = store.players[sessionId];
    if (player) {
      store.upsertPlayer({ ...player, isAlive: true, health: player.maxHealth });
    }
  }
}

function handleGameEvent(payload: GameEventPayload) {
  const store = useGameStore.getState();
  const { event } = payload;
  const data = payload.data ?? {};

  switch (event) {
    case GameEvent.WAVE_START:
      playSound('wave_start');
      if (typeof data.wave === 'number') {
        store.setWave(data.wave, store.maxWaves, store.enemiesRemaining);
      }
      break;
    case GameEvent.WAVE_COMPLETE:
      playSound('wave_complete');
      if (typeof data.wave === 'number') {
        store.setWave(data.wave, store.maxWaves, store.enemiesRemaining);
      }
      break;
    case GameEvent.BOSS_SPAWN:
      playSound('boss_entrance');
      break;
    case GameEvent.BOSS_PHASE_CHANGE:
      playSound(data.phase === 'enraged' ? 'boss_enraged' : 'boss_phase_change');
      break;
    case GameEvent.BOSS_DEFEATED:
      playSound('boss_death');
      emitBurst('boss_phase', [0, 1, 0], { color: '#ff9a3d', count: 40, power: 2 });
      break;
    case GameEvent.PLAYER_DIED:
      playSound('player_death');
      break;
    case 'player_respawn' as string:
      handlePlayerRespawn(data);
      break;
    case 'enemy_damaged': {
      const enemyId = data.enemyId as string;
      const enemy = store.enemies[enemyId];
      const isPower = Boolean(data.isPower);
      const isHeavy = data.attackType === 'heavy';
      const hitPos = data.position as { x: number; y?: number; z: number } | undefined;
      const pos: [number, number, number] = hitPos
        ? [hitPos.x, (hitPos.y ?? 0) + 0.6, hitPos.z]
        : enemy
        ? [enemy.position.x, enemy.position.y + 0.6, enemy.position.z]
        : [0, 1, 0];
      const weaponSound = (
        data.weapon === 'axe' ? 'axe_impact' :
        data.weapon === 'hammer' ? 'hammer_impact' :
        data.weapon === 'stick' ? 'stick_impact' :
        data.weapon === 'baseball_bat' ? 'bat_impact' :
        (isPower || isHeavy ? 'punch_heavy' : 'punch_light')
      );
      playSound(weaponSound as any);

      if (isPower) {
        emitBurst('shockwave', pos, { color: '#38bdf8', count: 24, power: 2.2 });
        emitBurst('spark', pos, { color: '#f59e0b', count: 24, power: 1.8 });
        triggerScreenShake(0.55);
      } else if (isHeavy) {
        emitBurst('spark', pos, { color: '#f59e0b', count: 16, power: 1.4 });
        triggerScreenShake(0.3);
      } else {
        emitBurst('spark', pos, { color: '#ffcc00', count: 12, power: 1.0 });
        triggerScreenShake(0.12);
      }
      break;
    }
    case GameEvent.PLAYER_KILLED: {
      playSound('enemy_death');
      const enemyId = data.enemyId as string;
      const enemy = store.enemies[enemyId];
      const hitPos = data.position as { x: number; y?: number; z: number } | undefined;
      const pos: [number, number, number] = hitPos
        ? [hitPos.x, (hitPos.y ?? 0) + 0.6, hitPos.z]
        : enemy
        ? [enemy.position.x, enemy.position.y + 0.6, enemy.position.z]
        : [0, 1, 0];
      emitBurst('enemy_death', pos, { color: '#ef4444', count: 28, power: 1.8 });
      if (data.isPower) {
        emitBurst('shockwave', pos, { color: '#38bdf8', count: 28, power: 2.5 });
        triggerScreenShake(0.65);
      } else {
        triggerScreenShake(0.25);
      }
      break;
    }
    case GameEvent.WEAPON_PICKUP:
      playSound('weapon_pickup');
      break;
    case GameEvent.WEAPON_DROP:
      playSound('weapon_drop');
      break;
    case GameEvent.MATCH_END:
      if (data.victory === true) {
        store.setPhase(RoomPhase.VICTORY);
        playSound('victory');
      }
      break;
    default:
      break;
  }
}

export function detachRoom() {
  if (syncRoom) {
    try {
      syncRoom.leave();
    } catch (err) {
      console.warn('[detach] failed to leave room', err);
    }
    syncRoom = null;
  }
  lastRoomId = null;
  reconnectAttempts = 0;
  const store = useGameStore.getState();
  store.setConnectionStatus('idle');
  store.setLocalSessionId(null);
  store.clearPlayers();
}