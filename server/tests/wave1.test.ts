import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import http from 'http';
import { GameRoom } from '../src/rooms/GameRoom';
import { RoomPhase } from '@storm-arena/shared';

async function runTest() {
  console.log('=== WAVE 1 VERIFICATION TEST ===');

  const httpServer = http.createServer();
  const gameServer = new Server({
    server: httpServer,
  });
  gameServer.define('game', GameRoom);

  await new Promise<void>((resolve) => {
    httpServer.listen(2590, () => {
      console.log('Test server listening on port 2590');
      resolve();
    });
  });

  const client1 = new Client('ws://localhost:2590');
  const client2 = new Client('ws://localhost:2590');

  // P1 creates
  const room1 = await client1.create('game', { playerName: 'Player 1' });
  console.log('P1 created room:', room1.id);

  // P2 joins
  const room2 = await client2.joinById(room1.id, { playerName: 'Player 2' });
  console.log('P2 joined room:', room2.id);

  // Start game
  console.log('P1 sends HOST_START...');
  room1.send('HOST_START', { countdown: 1 });

  // Wait for transition to GAME
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (room1.state.phase === RoomPhase.GAME && room2.state.phase === RoomPhase.GAME) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  console.log('Entered GAME phase!');
  console.log(`P1 state: phase=${room1.state.phase}, currentWave=${room1.state.currentWave}, enemiesRemaining=${room1.state.enemiesRemaining}, elapsedTime=${room1.state.elapsedTime}`);
  console.log(`P2 state: phase=${room2.state.phase}, currentWave=${room2.state.currentWave}, enemiesRemaining=${room2.state.enemiesRemaining}, elapsedTime=${room2.state.elapsedTime}`);

  if (room1.state.currentWave !== 1 || room2.state.currentWave !== 1) {
    throw new Error(`Expected currentWave === 1, got P1=${room1.state.currentWave}, P2=${room2.state.currentWave}`);
  }

  if (room1.state.enemiesRemaining !== 5 || room2.state.enemiesRemaining !== 5) {
    throw new Error(`Expected enemiesRemaining === 5, got P1=${room1.state.enemiesRemaining}, P2=${room2.state.enemiesRemaining}`);
  }

  console.log(`P1 enemies size: ${room1.state.enemies.size}`);
  console.log(`P2 enemies size: ${room2.state.enemies.size}`);

  if (room1.state.enemies.size !== 5 || room2.state.enemies.size !== 5) {
    throw new Error(`Expected enemies map size === 5, got P1=${room1.state.enemies.size}, P2=${room2.state.enemies.size}`);
  }

  // Check an enemy's position before and after a delay
  const enemyId = Array.from(room1.state.enemies.keys())[0];
  const initialEnemy = room1.state.enemies.get(enemyId);
  const initialPos = { x: initialEnemy.position.x, z: initialEnemy.position.z };
  console.log(`Sample enemy (${enemyId}) initial pos: x=${initialPos.x.toFixed(2)}, z=${initialPos.z.toFixed(2)}`);

  // Wait 1 second for enemy update loop to run
  await new Promise((r) => setTimeout(r, 1000));

  const updatedEnemy = room1.state.enemies.get(enemyId);
  const updatedPos = { x: updatedEnemy.position.x, z: updatedEnemy.position.z };
  const distMoved = Math.hypot(updatedPos.x - initialPos.x, updatedPos.z - initialPos.z);
  console.log(`Sample enemy (${enemyId}) pos after 1s: x=${updatedPos.x.toFixed(2)}, z=${updatedPos.z.toFixed(2)} (moved: ${distMoved.toFixed(4)})`);

  if (distMoved <= 0.1) {
    throw new Error(`Expected enemy to move towards player, but moved only ${distMoved}`);
  }

  // Also verify player movement still works
  console.log('Testing player 1 movement while enemies are active...');
  const p1InitialZ = room1.state.players.get(room1.sessionId).position.z;
  room1.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 1 },
    rotation: { x: 0, y: 0 },
    timestamp: Date.now(),
  });
  await new Promise((r) => setTimeout(r, 200));
  room1.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0 },
    timestamp: Date.now(),
  });
  await new Promise((r) => setTimeout(r, 100));

  const p1FinalZ = room1.state.players.get(room1.sessionId).position.z;
  console.log(`P1 movement: initial z=${p1InitialZ.toFixed(2)}, final z=${p1FinalZ.toFixed(2)}`);
  if (p1FinalZ <= p1InitialZ + 0.1) {
    throw new Error('Player did not move as expected');
  }

  console.log('ALL WAVE 1 VERIFICATIONS PASSED!');

  await room1.leave();
  await room2.leave();
  await gameServer.gracefullyShutdown();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
