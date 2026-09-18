import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom';

const PORT = 2568;
let failures: string[] = [];

function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

async function main() {
  const gameServer = new Server();
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);
  console.log('test server listening on', PORT);

  const client1 = new Client(`ws://localhost:${PORT}`);
  const room1 = await client1.joinOrCreate('game_room');
  room1.onMessage('GAME_EVENT', () => {});

  const client2 = new Client(`ws://localhost:${PORT}`);
  const room2 = await client2.joinOrCreate('game_room');
  room2.onMessage('GAME_EVENT', () => {});

  await new Promise((r) => setTimeout(r, 300));
  const st: any = room1.state;

  check(!!st, 'got room state');
  check(st.roomCode && st.roomCode.length === 4, `room code generated (${st.roomCode})`);
  check(st.phase === 'lobby', `phase is lobby (${st.phase})`);

  let players = [...st.players.values()];
  check(players.length === 2, `two players joined (${players.length})`);

  const host = players.find((p: any) => p.isHost);
  check(!!host, 'a host exists');
  const colors = players.map((p: any) => p.color).sort();
  check(
    JSON.stringify(colors) === JSON.stringify(['blue', 'red']),
    `distinct colors assigned (${colors.join(',')})`,
  );

  check(st.difficulty === 'normal', 'default difficulty normal');

  room1.send('HOST_START', { countdown: 0 });

  const phaseStart = Date.now();
  while (Date.now() - phaseStart < 3000 && st.phase !== 'game') {
    await new Promise((r) => setTimeout(r, 50));
  }
  check(st.phase === 'game', `host start transitions to game (${st.phase})`);

  room1.send('PLAYER_MOVE', {
    direction: { x: 1, y: 0, z: 0 },
    timestamp: Date.now(),
  });
  await new Promise((r) => setTimeout(r, 500));

  const hostPlayer = [...st.players.values()].find((p: any) => p.isHost);
  const moved = hostPlayer && hostPlayer.position.x > -5 + 1e-4;
  check(
    !!moved,
    `server-authoritative game movement applied (x=${hostPlayer?.position.x?.toFixed(2)})`,
  );

  console.log(failures.length === 0 ? '\nALL TESTS PASSED' : `\n${failures.length} TESTS FAILED`);
  room1.leave();
  room2.leave();
  await gameServer.gracefullyShutdown();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('TEST FAILED (exception):', err);
  process.exit(1);
});
