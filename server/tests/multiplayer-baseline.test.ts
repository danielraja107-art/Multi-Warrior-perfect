import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom, FIXED_SPAWN_POINTS } from '../src/rooms/GameRoom';
import { RoomPhase, PlayerState } from '@storm-arena/shared';

const PORT = 2577;
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

async function until(cond: () => boolean, what: string, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return true;
    await sleep(50);
  }
  check(false, `${what} (timed out after ${timeoutMs}ms)`);
  return false;
}

async function runBaselineTests() {
  console.log('==================================================');
  console.log('STARTING MULTIPLAYER BASELINE TESTS (TESTS 1 - 9)');
  console.log('==================================================\n');

  const gameServer = new Server();
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);
  console.log(`Server listening on port ${PORT}\n`);

  const client1 = new Client(`ws://localhost:${PORT}`);
  const client2 = new Client(`ws://localhost:${PORT}`);

  // -------------------------------------------------------------------------
  // TEST 1: P1 creates room
  // -------------------------------------------------------------------------
  console.log('[TEST 1] P1 creates room');
  const room1 = await client1.joinOrCreate('game_room', {});
  const p1SessionId = room1.sessionId;
  await until(() => room1.state.players.has(p1SessionId), 'P1 registered in room state');
  check(room1.state.phase === RoomPhase.LOBBY, 'P1 room initialized in LOBBY phase');
  const p1Player = room1.state.players.get(p1SessionId);
  check(p1Player?.isHost === true, 'P1 is host');
  console.log(`  P1 sessionId: ${p1SessionId}\n`);

  // -------------------------------------------------------------------------
  // TEST 2: P2 joins
  // -------------------------------------------------------------------------
  console.log('[TEST 2] P2 joins room');
  const room2 = await client2.joinById(room1.id, {});
  const p2SessionId = room2.sessionId;
  await until(() => room2.state.players.has(p2SessionId), 'P2 registered in room state');
  await until(() => room1.state.players.size === 2, 'P1 sees 2 players');
  await until(() => room2.state.players.size === 2, 'P2 sees 2 players');
  const p2Player = room2.state.players.get(p2SessionId);
  check(p2Player?.isHost === false, 'P2 is not host');
  console.log(`  P2 sessionId: ${p2SessionId}\n`);

  // -------------------------------------------------------------------------
  // TEST 3: Both clients remain in lobby
  // -------------------------------------------------------------------------
  console.log('[TEST 3] Both clients remain in lobby');
  check(room1.state.phase === RoomPhase.LOBBY, 'Client 1 is in LOBBY phase');
  check(room2.state.phase === RoomPhase.LOBBY, 'Client 2 is in LOBBY phase');
  await sleep(200);
  check(room1.state.phase === RoomPhase.LOBBY, 'Client 1 remains in LOBBY');
  check(room2.state.phase === RoomPhase.LOBBY, 'Client 2 remains in LOBBY\n');

  // -------------------------------------------------------------------------
  // TEST 4: P1 presses START -> Synchronized 5-second countdown
  // -------------------------------------------------------------------------
  console.log('[TEST 4] P1 presses START (Synchronized countdown)');
  // Start countdown with 5 seconds (standard flow)
  room1.send('HOST_START', { countdown: 5 });

  await until(() => room1.state.phase === RoomPhase.STARTING, 'P1 sees STARTING phase');
  await until(() => room2.state.phase === RoomPhase.STARTING, 'P2 sees STARTING phase');
  check(room1.state.phase === RoomPhase.STARTING, 'Both clients entered STARTING phase');
  check(room2.state.phase === RoomPhase.STARTING, 'Both clients confirmed in STARTING phase');

  // Track the countdown values observed by both clients
  const observedP1Countdown: number[] = [];
  const observedP2Countdown: number[] = [];

  const checkCountdown = async () => {
    for (let s = 5; s >= 1; s--) {
      await until(
        () => room1.state.countdownSeconds === s && room2.state.countdownSeconds === s,
        `Synchronized countdown at ${s}`,
        2000,
      );
      observedP1Countdown.push(room1.state.countdownSeconds);
      observedP2Countdown.push(room2.state.countdownSeconds);
      console.log(`  Countdown: ${s} (P1=${room1.state.countdownSeconds}, P2=${room2.state.countdownSeconds})`);
      await sleep(950);
    }
  };

  await checkCountdown();

  check(
    observedP1Countdown.includes(5) && observedP1Countdown.includes(1),
    `P1 observed countdown: ${observedP1Countdown.join(', ')}`,
  );
  check(
    observedP2Countdown.includes(5) && observedP2Countdown.includes(1),
    `P2 observed countdown: ${observedP2Countdown.join(', ')}\n`,
  );

  // -------------------------------------------------------------------------
  // TEST 5: Both enter GAME -> Fixed distinct spawn points
  // -------------------------------------------------------------------------
  console.log('[TEST 5] Both enter GAME at fixed distinct spawn points');
  await until(() => room1.state.phase === RoomPhase.GAME, 'P1 transitions to GAME phase');
  await until(() => room2.state.phase === RoomPhase.GAME, 'P2 transitions to GAME phase');
  check(room1.state.phase === RoomPhase.GAME, 'P1 in GAME phase');
  check(room2.state.phase === RoomPhase.GAME, 'P2 in GAME phase');
  check(room1.state.countdownSeconds === 0, 'Countdown timer cleared (0)');

  const p1InRoom1 = room1.state.players.get(p1SessionId);
  const p2InRoom1 = room1.state.players.get(p2SessionId);
  const p1InRoom2 = room2.state.players.get(p1SessionId);
  const p2InRoom2 = room2.state.players.get(p2SessionId);

  check(
    Math.abs(p1InRoom1.position.x - FIXED_SPAWN_POINTS[0].x) < 0.1 &&
    Math.abs(p1InRoom1.position.z - FIXED_SPAWN_POINTS[0].z) < 0.1,
    `P1 spawned at fixed spawn P1 (${p1InRoom1.position.x}, ${p1InRoom1.position.y}, ${p1InRoom1.position.z}) expected (-5, 0, 0)`,
  );
  check(
    Math.abs(p2InRoom2.position.x - FIXED_SPAWN_POINTS[1].x) < 0.1 &&
    Math.abs(p2InRoom2.position.z - FIXED_SPAWN_POINTS[1].z) < 0.1,
    `P2 spawned at fixed spawn P2 (${p2InRoom2.position.x}, ${p2InRoom2.position.y}, ${p2InRoom2.position.z}) expected (5, 0, 0)`,
  );
  check(
    p1InRoom1.position.x !== p2InRoom1.position.x,
    `Distinct spawn positions confirmed: P1 x=${p1InRoom1.position.x}, P2 x=${p2InRoom1.position.x}\n`,
  );

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // TEST 6: P1 presses WASD -> Only P1 moves locally -> Key Release
  // -------------------------------------------------------------------------
  console.log('[TEST 6] P1 presses WASD (moves +Z)');
  const p1StartPos = { ...p1InRoom1.position };
  const p2StartPos = { ...p2InRoom1.position };

  // P1 moves in +Z direction (S key)
  room1.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 1 },
    rotation: { x: 0, y: 0 },
    timestamp: Date.now(),
  });

  await until(
    () => room1.state.players.get(p1SessionId).position.z > p1StartPos.z + 0.3,
    'P1 moved forward in +Z',
    2000,
  );
  
  // KEY RELEASE: P1 releases key immediately
  const p1ReleaseTime = Date.now();
  const p1PosAtRelease = room1.state.players.get(p1SessionId).position.z;
  room1.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0 },
    timestamp: p1ReleaseTime,
  });

  const p2UnmovedZ = room1.state.players.get(p2SessionId).position.z;
  check(p1PosAtRelease > p1StartPos.z, `P1 position changed (+Z): ${p1StartPos.z} -> ${p1PosAtRelease.toFixed(4)}`);
  check(
    Math.abs(p2UnmovedZ - p2StartPos.z) < 0.05,
    `P2 remained stationary while P1 moved: z=${p2UnmovedZ.toFixed(2)} vs initial=${p2StartPos.z.toFixed(2)}`,
  );

  // Measure stop processing across ticks:
  // 1 tick window (50ms) to ensure stop message is processed on server
  await sleep(55);
  const p1StopProcessed = room1.state.players.get(p1SessionId).position.z;
  await sleep(50);
  const p1AfterTick1 = room1.state.players.get(p1SessionId).position.z;
  await sleep(50);
  const p1AfterTick2 = room1.state.players.get(p1SessionId).position.z;
  await sleep(50);
  const p1AfterTick3 = room1.state.players.get(p1SessionId).position.z;

  console.log(`  P1 measurement:`);
  console.log(`    - Position before release:            z = ${p1PosAtRelease.toFixed(4)}`);
  console.log(`    - Position when stop processed:       z = ${p1StopProcessed.toFixed(4)}`);
  console.log(`    - Position after 1 additional tick:   z = ${p1AfterTick1.toFixed(4)}`);
  console.log(`    - Position after 2 additional ticks:  z = ${p1AfterTick2.toFixed(4)}`);
  console.log(`    - Position after 3 additional ticks:  z = ${p1AfterTick3.toFixed(4)}`);

  check(
    Math.abs(p1AfterTick3 - p1StopProcessed) < 0.001 &&
    Math.abs(p1AfterTick2 - p1StopProcessed) < 0.001 &&
    Math.abs(p1AfterTick1 - p1StopProcessed) < 0.001,
    `P1 zero drift across 3 consecutive server ticks (delta = 0.0000)\n`,
  );

  // -------------------------------------------------------------------------
  // TEST 7: P2 watches P1 -> P1 movement appears smoothly on P2
  // -------------------------------------------------------------------------
  console.log('[TEST 7] P2 observes P1 movement on Client 2');
  const p1SeenByP2 = room2.state.players.get(p1SessionId);
  check(
    Math.abs(p1SeenByP2.position.z - p1StopProcessed) < 0.1,
    `Client 2 reflects P1 position: ${p1SeenByP2.position.z.toFixed(4)} (matches server ${p1StopProcessed.toFixed(4)})\n`,
  );

  // -------------------------------------------------------------------------
  // TEST 8: P2 presses WASD -> Only P2 moves locally -> Key Release
  // -------------------------------------------------------------------------
  console.log('[TEST 8] P2 presses WASD (moves -X)');
  const p2CurrentPos = { ...room2.state.players.get(p2SessionId).position };
  const p1CurrentPos = { ...room2.state.players.get(p1SessionId).position };

  // P2 moves in -X direction (A key)
  room2.send('PLAYER_MOVE', {
    direction: { x: -1, y: 0, z: 0 },
    rotation: { x: 0, y: Math.PI / 2 },
    timestamp: Date.now(),
  });

  await until(
    () => room2.state.players.get(p2SessionId).position.x < p2CurrentPos.x - 0.3,
    'P2 moved left in -X',
    2000,
  );

  // KEY RELEASE: P2 releases key immediately
  const p2ReleaseTime = Date.now();
  const p2PosAtRelease = room2.state.players.get(p2SessionId).position.x;
  room2.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: Math.PI / 2 },
    timestamp: p2ReleaseTime,
  });

  const p1UnmovedX = room1.state.players.get(p1SessionId).position.x;
  check(p2PosAtRelease < p2CurrentPos.x, `P2 position changed (-X): ${p2CurrentPos.x} -> ${p2PosAtRelease.toFixed(4)}`);
  check(
    Math.abs(p1UnmovedX - p1CurrentPos.x) < 0.05,
    `P1 remained stationary while P2 moved: x=${p1UnmovedX.toFixed(2)} vs initial=${p1CurrentPos.x.toFixed(2)}`,
  );

  // Measure stop processing across ticks:
  // 1 tick window (50ms) to ensure stop message is processed on server
  await sleep(55);
  const p2StopProcessed = room2.state.players.get(p2SessionId).position.x;
  await sleep(50);
  const p2AfterTick1 = room2.state.players.get(p2SessionId).position.x;
  await sleep(50);
  const p2AfterTick2 = room2.state.players.get(p2SessionId).position.x;
  await sleep(50);
  const p2AfterTick3 = room2.state.players.get(p2SessionId).position.x;

  console.log(`  P2 measurement:`);
  console.log(`    - Position before release:            x = ${p2PosAtRelease.toFixed(4)}`);
  console.log(`    - Position when stop processed:       x = ${p2StopProcessed.toFixed(4)}`);
  console.log(`    - Position after 1 additional tick:   x = ${p2AfterTick1.toFixed(4)}`);
  console.log(`    - Position after 2 additional ticks:  x = ${p2AfterTick2.toFixed(4)}`);
  console.log(`    - Position after 3 additional ticks:  x = ${p2AfterTick3.toFixed(4)}`);

  check(
    Math.abs(p2AfterTick3 - p2StopProcessed) < 0.001 &&
    Math.abs(p2AfterTick2 - p2StopProcessed) < 0.001 &&
    Math.abs(p2AfterTick1 - p2StopProcessed) < 0.001,
    `P2 zero drift across 3 consecutive server ticks (delta = 0.0000)\n`,
  );

  // -------------------------------------------------------------------------
  // TEST 9: P1 watches P2 -> P2 movement appears smoothly on P1
  // -------------------------------------------------------------------------
  console.log('[TEST 9] P1 observes P2 movement on Client 1');
  const p2SeenByP1 = room1.state.players.get(p2SessionId);
  check(
    Math.abs(p2SeenByP1.position.x - p2StopProcessed) < 0.1,
    `Client 1 reflects P2 position: ${p2SeenByP1.position.x.toFixed(4)} (matches server ${p2StopProcessed.toFixed(4)})\n`,
  );

  // -------------------------------------------------------------------------
  // TEARDOWN
  // -------------------------------------------------------------------------
  await room1.leave();
  await room2.leave();
  await gameServer.gracefullyShutdown();

  console.log('==================================================');
  if (failures.length === 0) {
    console.log('ALL TESTS 1 - 9 PASSED SUCCESSFULLY!');
  } else {
    console.log(`${failures.length} TESTS FAILED:`);
    failures.forEach((f) => console.log(' - ' + f));
  }
  console.log('==================================================\n');
  process.exit(failures.length === 0 ? 0 : 1);
}

runBaselineTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
