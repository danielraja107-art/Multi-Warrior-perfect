import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom';
import { gameRoomRouter } from '../src/api/GameRoomRouter';
import { RoomPhase } from '@storm-arena/shared';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  RoomError,
  getServerUrl,
} from '../../client/src/network/socket';
import { useGameStore } from '../../client/src/state/useGameStore';

const PORT = 2569;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;

let failures: string[] = [];

function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fresh = () => useGameStore.getState();

async function until(cond: () => boolean, what: string, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return true;
    await sleep(50);
  }
  check(false, `${what} (timeout after ${timeoutMs}ms)`);
  return false;
}

async function leaveAll(rooms: any[]) {
  for (const r of rooms) {
    if (r && typeof r.leave === 'function') {
      try {
        await Promise.race([
          r.leave().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 200)),
        ]);
      } catch {
        // ignore
      }
    }
  }
}

async function main() {
  check(getServerUrl() === `ws://localhost:${PORT}`, `server url resolved to ${getServerUrl()}`);

  const app = express();
  app.use(cors());
  app.use('/api', gameRoomRouter);
  const httpServer = http.createServer(app);

  const gameServer = new Server({ server: httpServer });
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);
  console.log('test game server listening on', PORT);

  const raw = new Client(`ws://localhost:${PORT}`);

  // -------------------------------------------------------------------------
  // 1. CreateRoom through the real client network module (host flow)
  // -------------------------------------------------------------------------
  console.log('\n[create-room flow]');
  const hostRoom = await createRoom('easy');
  check(hostRoom.roomId.length > 0, 'create returned a live room id');
  await until(() => fresh().lobby.roomCode.length === 4, 'room code pushed to store');
  check(fresh().connection.status === 'connected', 'store connection marked connected');
  check(Boolean(fresh().localPlayerId), 'local player id assigned');
  check(fresh().lobby.roomCode.length === 4, `room code generated (${fresh().lobby.roomCode})`);
  check(fresh().lobby.difficulty === 'easy', `difficulty echoed from server (${fresh().lobby.difficulty})`);
  check(fresh().lobby.hostId === fresh().localPlayerId, 'host is the local player');
  check(Object.keys(fresh().lobby.players).length === 1, 'local player present in lobby');

  const rawFriend = await raw.joinById(hostRoom.roomId, {});
  rawFriend.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    'lobby sees 2 players',
  );
  const lobby = fresh().lobby;
  check(Object.keys(lobby.players).length === 2, 'lobby consumed second player from server state');
  const colors = Object.values(lobby.players)
    .map((p) => p.color)
    .sort()
    .join(',');
  check(colors === 'blue,red', `distinct colors from server (${colors})`);

  startGame();
  await until(
    () => fresh().gameState?.phase === RoomPhase.GAME,
    'game phase consumed after host start',
  );
  check(fresh().isMatchActive, 'match marked active from authoritative phase');

  rawFriend.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() });
  await until(
    () => {
      const st = fresh().gameState;
      const p = st && st.players[rawFriend.sessionId];
      return !!p && p.position.x > -5 + 1e-4;
    },
    'authoritative movement consumed',
  );
  const moved = fresh().gameState!.players[rawFriend.sessionId];
  check(moved.position.x > -5 + 1e-4, `server movement present in store (x=${moved.position.x.toFixed(2)})`);

  await leaveRoom();
  check(fresh().connection.status === 'disconnected', 'connection cleared after leave');
  check(fresh().lobby.roomCode === '', 'lobby cleared after leave');
  await rawFriend.leave();

  // -------------------------------------------------------------------------
  // 2. joinRoom through the real client network module (guest flow, by code)
  // -------------------------------------------------------------------------
  console.log('\n[join-room-by-code flow]');
  const guestRoom = await raw.create('game_room', { difficulty: 'hard' });
  await until(() => Boolean(guestRoom.state?.roomCode), 'friend room code available');
  const code = guestRoom.state.roomCode;
  check(Boolean(code) && code.length === 4, `friend room code available (${code})`);
  await sleep(400);

  const joined = await joinRoom(code);
  check(Boolean(joined), 'joined the friend room via code');
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    'join lobby sees both players',
  );
  check(fresh().lobby.roomCode === code, 'lobby room code matches');
  check(fresh().lobby.hostId !== fresh().localPlayerId, 'guest is not the host');

  const filler3 = await raw.joinById(guestRoom.roomId, {});
  filler3.onMessage('GAME_EVENT', () => {});
  const filler4 = await raw.joinById(guestRoom.roomId, {});
  filler4.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 4,
    'room reaches 4 players',
  );
  await sleep(400);

  let fullCode: string | null = null;
  try {
    await joinRoom(code);
  } catch (err) {
    if (err instanceof RoomError) {
      fullCode = err.code;
      console.log('    (full-join rejected with code:', err.code, ')');
    } else {
      console.log('    (full-join threw non-RoomError:', (err as Error).message, ')');
    }
  }
  check(fullCode === 'ROOM_FULL', 'joining a full room rejected with ROOM_FULL');
  await leaveRoom();

  // -------------------------------------------------------------------------
  // 3. joinRoom error mapping
  // -------------------------------------------------------------------------
  console.log('\n[join-room errors]');
  let notFound = false;
  try {
    await joinRoom('ZZZZ');
  } catch (err) {
    notFound = err instanceof RoomError && err.code === 'ROOM_NOT_FOUND';
  }
  check(notFound, 'unknown code maps to ROOM_NOT_FOUND');

  let invalidInput = false;
  try {
    await joinRoom('ab');
  } catch (err) {
    invalidInput = err instanceof RoomError && err.code === 'INVALID_INPUT';
  }
  check(invalidInput, 'malformed code maps to INVALID_INPUT');

  await leaveAll([filler3, filler4, rawFriend, guestRoom, hostRoom]);
  console.log(failures.length === 0 ? '\nALL CLIENT-NETWORK TESTS PASSED' : `\n${failures.length} CLIENT-NETWORK TESTS FAILED`);
  process.exit(failures.length === 0 ? 0 : 1);
}

// safety net: never hang the test run
setTimeout(() => {
  console.log(failures.length === 0 ? '\nALL CLIENT-NETWORK TESTS PASSED' : `\n${failures.length} CLIENT-NETWORK TESTS FAILED`);
  process.exit(failures.length === 0 ? 0 : 1);
}, 45000).unref();

main().catch((err) => {
  console.error('CLIENT-NETWORK TEST FAILED (exception):', err);
  process.exit(1);
});