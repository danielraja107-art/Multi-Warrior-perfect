import { Client, Room } from 'colyseus.js';
import { attachRoom, detachRoom } from './MessageHandlers';
import { setActiveRoom } from './commands';
import { useGameStore } from '../state/GameStore';

export interface ConnectResult {
  room: Room;
  roomCode: string;
  isHost: boolean;
}

const SERVER_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SERVER_URL ??
  'ws://localhost:2567';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client(SERVER_URL);
  }
  return client;
}

export async function createRoom(difficulty?: string): Promise<ConnectResult> {
  useGameStore.getState().setConnectionStatus('connecting');
  let room: Room;
  try {
    room = await getClient().joinOrCreate('game_room', { difficulty });
  } catch (err) {
    useGameStore.getState().setConnectionStatus('disconnected', String(err));
    throw err;
  }
  return handleRoomJoin(room);
}

export async function joinRoomByCode(roomCode: string): Promise<ConnectResult> {
  useGameStore.getState().setConnectionStatus('connecting');
  let room: Room;
  try {
    room = await getClient().joinById(roomCode);
  } catch (err) {
    useGameStore.getState().setConnectionStatus('disconnected', String(err));
    throw err;
  }
  return handleRoomJoin(room);
}

function handleRoomJoin(room: Room): ConnectResult {
  const state = room.state as unknown as { roomCode: string; hostId: string };
  const sessionId = room.sessionId;
  const isHost =
    (state as unknown as { hostId?: string }).hostId === sessionId;

  attachRoom(room, sessionId);
  setActiveRoom(room);

  const store = useGameStore.getState();
  store.setRoomMeta({
    roomCode: state.roomCode,
    phase: store.phase,
    difficulty: store.difficulty,
    currentWave: store.currentWave,
    maxWaves: store.maxWaves,
    enemiesRemaining: store.enemiesRemaining,
    hostId: (state as unknown as { hostId?: string }).hostId ?? '',
    localSessionId: sessionId,
    isHost,
  });

  return { room, roomCode: state.roomCode, isHost };
}

export function leaveRoom() {
  detachRoom();
  setActiveRoom(null);
}

export function getServerUrl(): string {
  return SERVER_URL;
}