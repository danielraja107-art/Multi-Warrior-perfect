process.env.STORM_RECONNECT_TIMEOUT_MS = '5000';

import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { RoomPhase, ConnectionStatus, BossPhase } from '@storm-arena/shared';
import {
  createRoom,
  startGame,
  leaveRoom,
  reconnect,
  getCurrentRoom,
  RoomError,
} from '../../client/src/network/socket';
import {
  resetFailures,
  check,
  fresh,
  until,
  startGameServer,
  leaveAll,
  finish,
  sleep,
} from './helpers';

const PORT = 2565;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;

const title = 'RECONNECTION UI';

interface ServerRoomLike {
  state: {
    players: {
      size: number;
      forEach: (cb: (p: any) => void) => void;
    };
    phase: string;
  };
}

function serverRoom(roomId: string): ServerRoomLike | undefined {
  try {
    return matchMaker.getRoomById(roomId) as unknown as ServerRoomLike;
  } catch {
    return undefined;
  }
}

function findPlayer(room: ServerRoomLike, sessionId: string) {
  let found: any = undefined;
  room.state.players.forEach((p) => {
    if (p.sessionId === sessionId) found = p;
  });
  return found;
}

function countHostees(room: ServerRoomLike): any[] {
  const hosts: any[] = [];
  room.state.players.forEach((p) => {
    if (p.isHost) hosts.push(p);
  });
  return hosts;
}

function serverPosition(room: ServerRoomLike, sessionId: string) {
  const p = findPlayer(room, sessionId);
  return p ? { x: p.position.x, y: p.position.y, z: p.position.z } : null;
}

async function freshRaw() {
  return new Client(`ws://localhost:${PORT}`);
}

async function main() {
  resetFailures();
  const { GameRoom } = await import('../src/rooms/GameRoom.js');

  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);
  console.log('reconnect window is 5000ms (STORM_RECONNECT_TIMEOUT_MS)');

  const raw = await freshRaw();

  // =========================================================================
  // 1. LOBBY DISCONNECT — PERMANENT (player removed, no reconnection)
  // =========================================================================
  console.log('\n[1] disconnect in lobby]');
  const lobbyRoom = await createRoom('easy');
  const lobbyGuest = await raw.joinById(lobbyRoom.roomId, {});
  lobbyGuest.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    '1: lobby reaches 2 players',
  );

  check(serverRoom(lobbyRoom.roomId)!.state.players.size === 2, '1: two players before lobby disconnect');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => serverRoom(lobbyRoom.roomId)!.state.players.size === 1,
    '1: server removes lobby-leaver immediately',
  );
  check(
    serverRoom(lobbyRoom.roomId)!.state.players.size === 1,
    '1: lobby disconnect removes the player permanently (no seat held)',
  );
  check(
    fresh().connection.status === ConnectionStatus.RECONNECTING,
    '1: unexpected leave enters reconnecting client state',
  );
  check(fresh().connection.roomId === null, '1: connection cleared after unexpected leave');
  check(
    countHostees(serverRoom(lobbyRoom.roomId)!).length === 1,
    '1: host authority re-assigned to a remaining player',
  );
  await sleep(300);

  // =========================================================================
  // 2. IN-GAME DISCONNECT + RECONNECT WITHIN WINDOW
  // =========================================================================
  console.log('\n[2] reconnect within window]');
  const gameRoom = await createRoom('normal');
  const gameGuest = await raw.joinById(gameRoom.roomId, {});
  gameGuest.onMessage('GAME_EVENT', () => {});
  await until(
    () => serverRoom(gameRoom.roomId)!.state.players.size === 2,
    '2: game room reaches 2 players',
  );
  startGame();
  await until(
    () => fresh().gameState?.phase === RoomPhase.GAME,
    '2: game room transitioned to GAME',
  );
  check(fresh().isMatchActive, '2: match marked active');

  // Move the local player a little so state restoration is Observable.
  (getCurrentRoom() as any).send('PLAYER_MOVE', {
    direction: { x: 1, y: 0, z: 0 },
    timestamp: Date.now(),
  });
  await until(
    () => {
      const localId = fresh().localPlayerId;
      return !!localId && (fresh().gameState?.players[localId]?.position.x ?? -5) > -3;
    },
    '2: local player moved before disconnect',
  );

  const localIdBefore = fresh().localPlayerId!;

  // Stop moving so velocity is zero before disconnect
  (getCurrentRoom() as any).send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 0 },
    timestamp: Date.now(),
  });
  await sleep(100);

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    '2: disconnect during game enters reconnecting state',
  );

  const posAtDisconnect = serverPosition(serverRoom(gameRoom.roomId)!, localIdBefore);
  check(posAtDisconnect !== null && posAtDisconnect.x > -3, '2: local player position advanced');
  check(
    serverRoom(gameRoom.roomId)!.state.players.size === 2,
    '2: player slot kept during the reconnection window',
  );
  const pDuringReconnect = serverRoom(gameRoom.roomId)?.state?.players?.size;
  check((pDuringReconnect ?? 0) >= 1, '2: player kept in room during reconnection window');

  await sleep(400);
  const posDuringHold = serverPosition(serverRoom(gameRoom.roomId)!, localIdBefore);
  const frozen =
    posDuringHold !== null &&
    posAtDisconnect !== null &&
    Math.abs(posDuringHold.x - posAtDisconnect.x) < 1e-3;
  check(frozen, '2: held player freezes in place (no drift during window)');

  // -------------------------------------------------------------------------
  // Reconnect within the window restores the player's state
  // -------------------------------------------------------------------------
  console.log('\n[reconnect within window]');
  const restored = await reconnect();
  check(Boolean(restored), '2: reconnect() restored a live room');
  await until(
    () =>
      fresh().connection.status === ConnectionStatus.CONNECTED &&
      serverRoom(gameRoom.roomId)!.state.players.size === 2 &&
      fresh().gameState?.phase === RoomPhase.GAME,
    '2: game state restored after reconnect',
  );

  check(fresh().connection.status === ConnectionStatus.CONNECTED, '2: connection status is CONNECTED');
  check(fresh().connection.roomId !== null, '2: roomId is set after reconnect');
  check(Object.keys(fresh().lobby.players).length === 2, '2: player slots restored (2 players)');
  check(fresh().gameState?.phase === RoomPhase.GAME, '2: game phase preserved as GAME');
  check(fresh().localPlayerId !== null, '2: localPlayerId restored after reconnect');
  check(fresh().isMatchActive === true, '2: match still active after reconnect');

  const localIdAfter = fresh().localPlayerId!;
  const posAfter = serverPosition(serverRoom(gameRoom.roomId)!, localIdAfter);
  const stateRestored =
    posAfter !== null &&
    posAtDisconnect !== null &&
    Math.abs(posAfter.x - posAtDisconnect.x) < 1e-3;
  check(stateRestored, '2: player position restored after reconnect');

  // Movement must keep working for the restored player (inputs route by session id).
  const restoredRoom = getCurrentRoom();
  check(restoredRoom != null, '2: restored room is the active room');
  if (restoredRoom) {
    restoredRoom.send('PLAYER_MOVE', {
      direction: { x: 1, y: 0, z: 0 },
      timestamp: Date.now(),
    });
    await until(
      () => (serverPosition(serverRoom(gameRoom.roomId)!, fresh().localPlayerId!)?.x ?? -999) > (posAtDisconnect?.x ?? 0) + 0.5,
      '2: movement resumes after reconnect',
    );
    check(true, '2: server accepts movement from the reconnected player');
  }

  // =========================================================================
  // 3. DISCONNECT DURING BOSS PHASE
  // =========================================================================
  console.log('\n[3] disconnect during boss phase]');
  const bossRoom = matchMaker.getRoomById(gameRoom.roomId) as any;
  bossRoom.state.boss.health = 400;
  bossRoom.state.boss.maxHealth = 500;
  bossRoom.state.boss.phase = BossPhase.PHASE_2;
  bossRoom.state.boss.isActive = true;
  bossRoom.state.boss.isEnraged = false;

  await until(() => fresh().gameUI.bossHealth === 400, '3: boss health consumed before disconnect');
  check(fresh().gameUI.bossHealth === 400, '3: boss health is 400 before disconnect');
  check(fresh().gameUI.bossPhase === BossPhase.PHASE_2, '3: boss phase is PHASE_2 before disconnect');

  (getCurrentRoom() as any).connection.close(4001);
  await sleep(200);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    '3: disconnect during boss enters reconnecting state',
  );
  const bossP = serverRoom(gameRoom.roomId)?.state?.players?.size;
  check((bossP ?? 0) >= 1, '3: player kept in room during boss disconnect');

  const bossOnServer = bossRoom.state.boss;
  check(bossOnServer.health === 400, '3: boss health preserved on server');
  check(bossOnServer.phase === BossPhase.PHASE_2, '3: boss phase preserved on server');
  check(bossOnServer.isActive === true, '3: boss still active on server');

  const bossReconnected = await reconnect();
  check(Boolean(bossReconnected), '3: reconnect during boss phase succeeded');
  await until(
    () =>
      fresh().connection.status === ConnectionStatus.CONNECTED &&
      fresh().gameState?.phase === RoomPhase.GAME,
    '3: game state restored after boss reconnect',
  );

  check(fresh().gameUI.bossHealth === 400, '3: boss health restored after reconnect');
  check(fresh().gameUI.bossPhase === BossPhase.PHASE_2, '3: boss phase restored after reconnect');
  check(fresh().connection.status === ConnectionStatus.CONNECTED, '3: connected after boss reconnect');

  // =========================================================================
  // 4. BOSS PHASE CHANGE DURING RECONNECTION WINDOW
  // =========================================================================
  console.log('\n[4] boss phase change during reconnect]');
  bossRoom.state.boss.health = 150;
  bossRoom.state.boss.phase = BossPhase.ENRAGED;
  bossRoom.state.boss.isEnraged = true;

  await until(() => fresh().gameUI.bossHealth === 150, '4: boss health updated');
  check(fresh().gameUI.bossPhase === BossPhase.ENRAGED, '4: boss phase updated to ENRAGED');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    '4: disconnect during enraged boss',
  );

  bossRoom.state.boss.health = 50;
  await sleep(500);

  const enragedReconnect = await reconnect();
  await until(
    () => fresh().connection.status === ConnectionStatus.CONNECTED,
    '4: reconnected after enraged boss disconnect',
  );

  await sleep(300);
  await until(() => fresh().gameUI.bossHealth === 50, '4: boss health reaches 50 after reconnect');
  check(fresh().gameUI.bossHealth === 50, '4: boss health updated to 50 after reconnect');
  check(fresh().gameUI.bossPhase === BossPhase.ENRAGED, '4: boss phase still ENRAGED after reconnect');
  check(fresh().gameUI.bossEnraged === true, '4: boss enraged flag restored');

  // Clean up game room
  await leaveRoom();
  await sleep(500);
  await gameGuest.leave();
  await sleep(500);

  // =========================================================================
  // 5. RECONNECT AFTER WINDOW EXPIRED (server removes the player)
  // =========================================================================
  console.log('\n[5] reconnect after window expiry]');
  const raw5 = await freshRaw();
  const expiryRoom = await createRoom('easy');
  const expiryGuest = await raw5.joinById(expiryRoom.roomId, {});
  expiryGuest.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    '5: lobby reaches 2 players',
  );

  startGame();
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, '5: game started');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    '5: disconnect enters reconnecting state',
  );

  // Wait for window to expire (5s + buffer)
  await until(
    () => (serverRoom(expiryRoom.roomId)?.state?.players?.size ?? 0) === 1,
    '5: server removes player after reconnect window expires',
    12000,
  );

  let rejected = false;
  try {
    await reconnect();
  } catch (err) {
    rejected = err instanceof RoomError;
  }
  check(rejected, '5: reconnect after window expiry is rejected');
  check(
    fresh().connection.status === ConnectionStatus.DISCONNECTED,
    '5: connection returns to disconnected after failed reconnect',
  );

  await expiryGuest.leave();
  await sleep(500);

  // =========================================================================
  // 6. REMAINING PLAYER CONTINUATION — 4→3→2 PLAYERS
  // =========================================================================
  console.log('\n[6] remaining player continuation]');
  const raw6a = await freshRaw();
  const raw6b = await freshRaw();
  const raw6c = await freshRaw();
  const contRoom = await createRoom('normal');
  const contGuest1 = await raw6a.joinById(contRoom.roomId, {});
  contGuest1.onMessage('GAME_EVENT', () => {});
  const contGuest2 = await raw6b.joinById(contRoom.roomId, {});
  contGuest2.onMessage('GAME_EVENT', () => {});
  const contGuest3 = await raw6c.joinById(contRoom.roomId, {});
  contGuest3.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length >= 4,
    '6: 4-player room created',
  );
  check(Object.keys(fresh().lobby.players).length === 4, '6: 4 players in lobby');

  startGame();
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, '6: game started');
  check(fresh().isMatchActive === true, '6: match active with 4 players');

  await contGuest3.leave();
  await sleep(500);

  check(fresh().isMatchActive === true, '6: match still active after 1 player leaves');
  check(fresh().gameState?.phase === RoomPhase.GAME, '6: game phase still GAME');

  await contGuest2.leave();
  await sleep(500);

  check(fresh().isMatchActive === true, '6: match still active with 2 players');
  check(fresh().gameState?.phase === RoomPhase.GAME, '6: game phase still GAME with 2 players');

  const remainingPlayers = Object.keys(fresh().lobby.players).length;
  check(remainingPlayers >= 2, `6: at least 2 players remain (${remainingPlayers})`);

  await leaveRoom();
  await sleep(500);
  await contGuest1.leave();
  await sleep(500);

  // =========================================================================
  // 7. ROOM DESTROYED WHEN EMPTY
  // =========================================================================
  console.log('\n[7] room destroyed when empty]');
  const raw7 = await freshRaw();
  const destroyGuest = await raw7.create('game_room', { difficulty: 'easy' });
  destroyGuest.onMessage('GAME_EVENT', () => {});
  await sleep(500);
  const destroyGuest2 = await raw7.joinById(destroyGuest.roomId, {});
  destroyGuest2.onMessage('GAME_EVENT', () => {});
  await sleep(500);
  const destroyGuest3 = await raw7.joinById(destroyGuest.roomId, {});
  destroyGuest3.onMessage('GAME_EVENT', () => {});
  await sleep(500);

  // Leave all — room should be destroyed
  await destroyGuest.leave();
  await sleep(200);
  await destroyGuest2.leave();
  await sleep(200);
  await destroyGuest3.leave();
  await sleep(200);

  await until(() => !serverRoom(destroyGuest.roomId), '7: room destroyed when empty', 8000);
  check(true, '7: empty room is disposed by the server');

  // =========================================================================
  // 8. RECONNECT UI — CORRECT SCREEN VERIFICATION
  // =========================================================================
  console.log('\n[8] reconnect UI screen correctness]');
  const raw8 = await freshRaw();
  const screenRoom = await createRoom('easy');
  const screenGuest = await raw8.joinById(screenRoom.roomId, {});
  screenGuest.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length >= 2,
    '8: lobby reached',
  );

  startGame();
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, '8: game started');

  check(fresh().isMatchActive === true, '8: UI shows active match');
  check(fresh().gameState?.phase === RoomPhase.GAME, '8: UI shows GAME phase');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    '8: UI shows reconnecting state',
  );

  check(fresh().connection.status === ConnectionStatus.RECONNECTING, '8: status is RECONNECTING');
  check(fresh().isMatchActive === true, '8: match still marked active during reconnect');

  await reconnect();
  await until(
    () => fresh().connection.status === ConnectionStatus.CONNECTED,
    '8: reconnected',
  );

  check(fresh().connection.status === ConnectionStatus.CONNECTED, '8: status is CONNECTED');
  check(fresh().gameState?.phase === RoomPhase.GAME, '8: screen is GAME (not lobby)');
  check(fresh().isMatchActive === true, '8: match still active after reconnect');
  check(fresh().localPlayerId !== null, '8: localPlayerId restored');

  // =========================================================================
  // CLEANUP
  // =========================================================================
  await leaveAll([screenGuest, screenRoom, contRoom, destroyGuest, destroyGuest2, destroyGuest3, raw5, raw6a, raw6b, raw6c, raw7, raw8]);
  finish(title);
}

// safety net: never hang the test run
setTimeout(finish, 120000, title).unref();

main().catch((err) => {
  console.error('RECONNECTION UI TEST FAILED (exception):', err);
  process.exit(1);
});
