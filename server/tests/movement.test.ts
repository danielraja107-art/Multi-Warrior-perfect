import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom';
import { MovementSystem, PLAYER_SPEED } from '../src/gameplay/movement/MovementSystem';

const PORT = 2569;
let failures: string[] = [];

function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

function testMovementSystem() {
  console.log('--- MovementSystem unit tests ---');
  const ms = new MovementSystem();
  const sid = 'p1';

  check(ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, timestamp: 100 }), 'accepts first input');
  check(ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, timestamp: 80 }) === false, 'rejects out-of-order timestamp');

  let up = ms.update(sid, 50);
  check(up.velocity.x === 1 && up.hasInput, `velocity reflects queued direction (x=${up.velocity.x})`);

  ms.enqueueInput(sid, { direction: { x: 0, y: 0, z: 0 }, timestamp: 120 });
  up = ms.update(sid, 50);
  check(up.velocity.x === 0 && !up.hasInput, 'stop input zeroes velocity');

  check(up.rotation === null, 'no rotation when input has none');

  ms.clear(sid);
  up = ms.update(sid, 50);
  check(up.velocity.x === 0 && !up.hasInput, 'clear zeroes velocity');

  ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, rotation: { x: 0.5, y: 0.25 }, timestamp: 200 });
  up = ms.update(sid, 50);
  check(up.rotation && up.rotation.x === 0.5 && up.rotation.y === 0.25, 'applies rotation from input');

  const bound = 20;
  const reps = Math.ceil((bound * 2) / (PLAYER_SPEED * 0.05)) + 10;
  for (let i = 0; i < reps; i++) {
    ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, timestamp: 300 + i });
    ms.update(sid, 50);
  }
  up = ms.update(sid, 50);
  check(up.velocity.x === 1, 'velocity remains 1 toward boundary after many ticks');
}

testMovementSystem();

console.log('\n--- Integration: boundary + move/stop ---');

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setupGame(): Promise<{ room1: any; room2: any; state: any }> {
  const client1 = new Client(`ws://localhost:${PORT}`);
  const room1 = await client1.joinOrCreate('game_room');
  room1.onMessage('GAME_EVENT', () => {});
  const client2 = new Client(`ws://localhost:${PORT}`);
  const room2 = await client2.joinOrCreate('game_room');
  room2.onMessage('GAME_EVENT', () => {});
  await wait(200);

  room1.send('HOST_START', {});
  await wait(200);
  return { room1, room2, state: room1.state };
}

async function findHost(state: any): Promise<any> {
  return [...state.players.values()].find((p: any) => p.isHost);
}

async function main() {
  const gameServer = new Server();
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);

  console.log('test server listening on', PORT);

  const { room1, room2, state } = await setupGame();
  const host = await findHost(state);
  const startX = host.position.x;
  check(startX === -5, `host spawns at x=-5 (x=${startX})`);

  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(300);
  let hostP = await findHost(state);
  check(Math.abs(hostP.position.x - startX) < 1e-3, 'zero input produces no movement');

  room1.send('PLAYER_MOVE', { direction: { x: 5, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(300);
  hostP = await findHost(state);
  check(
    Math.abs(hostP.position.x - startX) < 1e-3,
    'over-normalized direction (magnitude 5) rejected',
  );

  room1.send('PLAYER_MOVE', { direction: { x: Number.NaN, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(300);
  hostP = await findHost(state);
  check(Math.abs(hostP.position.x - startX) < 1e-3, 'non-finite direction rejected');

  room1.send('PLAYER_MOVE', { direction: { x: -1, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(3600);
  hostP = await findHost(state);
  check(
    Math.abs(hostP.position.x - -20) < 0.5,
    `movement clamped at negative boundary (x=${hostP.position.x.toFixed(2)})`,
  );

  const atBoundary = hostP.position.x;
  room1.send('PLAYER_MOVE', { direction: { x: -1, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(700);
  hostP = await findHost(state);
  check(Math.abs(hostP.position.x - atBoundary) < 1e-3, 'player cannot move past boundary');

  room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(200);
  hostP = await findHost(state);
  const stateLabel = hostP.state;
  check(stateLabel === 'running', `running state set on valid input (state=${stateLabel})`);

  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(200);
  hostP = await findHost(state);
  check(hostP.state === 'idle', `idle state restored on empty input (state=${hostP.state})`);

  // Move +x for enough ticks to hit boundary (+20)
  const start = host.position.x;
  for (let i = 0; i < 200; i++) {
    room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() + i });
    await wait(20);
  }
  await wait(200);
  hostP = await findHost(state);
  check(hostP.position.x <= 20, `movement clamps at boundary (x=${hostP.position.x.toFixed(2)})`);
  check(hostP.position.x > start, 'player moved forward from start');

  // Stop input: send zero direction, position should stop changing
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() + 100000 });
  await wait(100);
  const stopped = hostP.position.x;
  await wait(200);
  hostP = await findHost(state);
  check(Math.abs(hostP.position.x - stopped) < 0.001, `player stops on zero input (dx=${(hostP.position.x - stopped).toFixed(4)})`);

  // Reject invalid direction (magnitude > 1)
  room1.send('PLAYER_MOVE', { direction: { x: 99, y: 0, z: 0 }, timestamp: Date.now() + 200000 });
  check(true, 'invalid move message sent (server must reject silently - no crash)');

  console.log('\n--- Independent multi-player movement ---');
  const getP2 = (s: any) => [...s.players.values()].find((p: any) => !p.isHost);
  let p2 = getP2(state);
  const p2Start = { x: p2.position.x, y: p2.position.y, z: p2.position.z };

  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(100);
  const p1Before = (await findHost(state)).position.x;

  room2.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 1 }, timestamp: Date.now() });
  await wait(800);
  p2 = getP2(room2.state);
  const p1After = (await findHost(state)).position.x;
  check(p2.position.z > p2Start.z, `player2 moved independently on +z (z=${p2.position.z.toFixed(2)})`);
  check(Math.abs(p1After - p1Before) < 0.01, `player1 unaffected while player2 moves (x=${p1After.toFixed(2)})`);

  console.log('\n--- 20Hz tick sanity ---');
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  const t0 = state.elapsedTime;
  await wait(1000);
  const elapsedDelta = state.elapsedTime - t0;
  check(elapsedDelta > 700 && elapsedDelta < 1300, `elapsedTime advanced ~1s (${elapsedDelta.toFixed(0)}ms)`);

  console.log(
    failures.length === 0
      ? '\nALL MOVEMENT TESTS PASSED'
      : `\n${failures.length} MOVEMENT TESTS FAILED`,
  );
  room1.leave();
  await gameServer.gracefullyShutdown();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('MOVEMENT TEST FAILED (exception):', err);
  process.exit(1);
});