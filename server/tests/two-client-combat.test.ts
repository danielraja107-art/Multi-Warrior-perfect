import { Server, matchMaker } from 'colyseus';
import { Client } from 'colyseus.js';
import http from 'http';
import { GameRoom } from '../src/rooms/GameRoom';
import { RoomPhase, WeaponType, AttackType, GameEvent } from '@storm-arena/shared';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(cond: () => boolean, desc: string, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return;
    await sleep(50);
  }
  throw new Error(`Timeout waiting for: ${desc}`);
}

async function movePlayerTo(room: any, targetPos: { x: number; z: number }, playerId: string, maxSteps = 100) {
  for (let i = 0; i < maxSteps; i++) {
    const p = room.state.players.get(playerId);
    if (!p) break;
    const dx = targetPos.x - p.position.x;
    const dz = targetPos.z - p.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= 0.8) break;
    room.send('PLAYER_MOVE', {
      direction: { x: dx / dist, y: 0, z: dz / dist },
      rotation: { x: 0, y: Math.atan2(dx, dz) },
      timestamp: Date.now(),
    });
    await sleep(50);
  }
  room.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0 },
    timestamp: Date.now(),
  });
  await sleep(100);
}

async function movePlayerNearEnemy(room: any, enemyId: string, playerId: string, maxSteps = 80) {
  for (let i = 0; i < maxSteps; i++) {
    const enemy = room.state.enemies.get(enemyId);
    const p = room.state.players.get(playerId);
    if (!enemy || !p) break;
    const dx = enemy.position.x - p.position.x;
    const dz = enemy.position.z - p.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= 1.2) break;
    room.send('PLAYER_MOVE', {
      direction: { x: dx / dist, y: 0, z: dz / dist },
      rotation: { x: 0, y: Math.atan2(dx, dz) },
      timestamp: Date.now(),
    });
    await sleep(50);
  }
  room.send('PLAYER_MOVE', {
    direction: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0 },
    timestamp: Date.now(),
  });
  await sleep(100);
}

async function runTest() {
  console.log('==================================================');
  console.log('TWO-CLIENT WEAPON PICKUP + COMBAT FEEL TEST');
  console.log('==================================================');

  const httpServer = http.createServer();
  const gameServer = new Server({ server: httpServer });
  gameServer.define('game', GameRoom);

  await new Promise<void>((resolve) => {
    httpServer.listen(2592, () => {
      console.log('Combat test server running on port 2592');
      resolve();
    });
  });

  const client1 = new Client('ws://localhost:2592');
  const client2 = new Client('ws://localhost:2592');

  const room1 = await client1.create('game', { playerName: 'Player 1' });
  const room2 = await client2.joinById(room1.id, { playerName: 'Player 2' });

  const p1Events: Array<{ event: string; data: any }> = [];
  const p2Events: Array<{ event: string; data: any }> = [];
  room1.onMessage('GAME_EVENT', (msg) => p1Events.push(msg));
  room2.onMessage('GAME_EVENT', (msg) => p2Events.push(msg));

  // P1 starts game
  room1.send('HOST_START', { countdown: 1 });

  await until(() => room1.state.phase === RoomPhase.GAME && room2.state.phase === RoomPhase.GAME, 'transition to GAME');
  await until(() => room1.state.enemies.size === 5 && room2.state.enemies.size === 5, '5 enemies spawned');

  const serverRoom = matchMaker.getRoomById(room1.id) as any;

  // -------------------------------------------------------------
  // CHECKPOINT 1: WEAPON PICKUPS VISIBLE & GROUNDED
  // -------------------------------------------------------------
  console.log('\n[CHECKPOINT 1] Weapon Pickups Visible & Grounded');
  await until(() => room1.state.weaponPickups.size === 4 && room2.state.weaponPickups.size === 4, '4 weapon pickups in state');

  const pickupTypes = new Set<string>();
  room1.state.weaponPickups.forEach((wp: any) => {
    pickupTypes.add(wp.type);
    if (Math.abs(wp.position.y - 0.5) > 0.01) {
      throw new Error(`Expected pickup ${wp.type} at y=0.5, got y=${wp.position.y}`);
    }
  });

  console.log(`  Pickups found: ${Array.from(pickupTypes).join(', ')}`);
  for (const expected of [WeaponType.BASEBALL_BAT, WeaponType.AXE, WeaponType.HAMMER, WeaponType.STICK]) {
    if (!pickupTypes.has(expected)) {
      throw new Error(`Missing expected arena pickup: ${expected}`);
    }
  }

  // Verify initial weapon is FIST and powerAvailable is true
  const p1Initial = room1.state.players.get(room1.sessionId);
  const p2Initial = room2.state.players.get(room2.sessionId);
  if (p1Initial.weapon !== WeaponType.FIST || p2Initial.weapon !== WeaponType.FIST) {
    throw new Error(`Expected initial weapons to be FIST, got P1=${p1Initial.weapon}, P2=${p2Initial.weapon}`);
  }
  if (!p1Initial.powerAvailable || !p2Initial.powerAvailable) {
    throw new Error('Expected initial powerAvailable to be true for both players');
  }
  console.log('  PASS: Checkpoint 1 verified (4 grounded pickups, initial weapon FIST, powerAvailable true)');

  // -------------------------------------------------------------
  // CHECKPOINT 2: SERVER-AUTHORITATIVE PICKUP RACE ARBITRATION
  // -------------------------------------------------------------
  console.log('\n[CHECKPOINT 2] Server-Authoritative Pickup Race Arbitration');
  let batPickupId = '';
  let batPos = { x: -4.0, z: 3.5 };
  room1.state.weaponPickups.forEach((wp: any, id: string) => {
    if (wp.type === WeaponType.BASEBALL_BAT) {
      batPickupId = id;
      batPos = { x: wp.position.x, z: wp.position.z };
    }
  });

  if (!batPickupId) throw new Error('Baseball bat pickup not found');

  console.log(`  Moving P1 and P2 near Baseball Bat (${batPos.x}, ${batPos.z})...`);
  await movePlayerTo(room1, { x: batPos.x - 0.5, z: batPos.z }, room1.sessionId);
  await movePlayerTo(room2, { x: batPos.x + 0.5, z: batPos.z }, room2.sessionId);

  console.log('  Triggering simultaneous pickup race...');
  room1.send('PLAYER_PICKUP', { weaponPickupId: batPickupId, timestamp: Date.now() });
  room2.send('PLAYER_PICKUP', { weaponPickupId: batPickupId, timestamp: Date.now() });

  await until(
    () =>
      room1.state.players.get(room1.sessionId).weapon === WeaponType.BASEBALL_BAT ||
      room2.state.players.get(room2.sessionId).weapon === WeaponType.BASEBALL_BAT,
    'One player equips baseball bat'
  );

  const p1HasBat = room1.state.players.get(room1.sessionId).weapon === WeaponType.BASEBALL_BAT;
  const p2HasBat = room2.state.players.get(room2.sessionId).weapon === WeaponType.BASEBALL_BAT;

  if (p1HasBat && p2HasBat) {
    throw new Error('RACE FAILED: Both players obtained the baseball bat!');
  }
  if (!p1HasBat && !p2HasBat) {
    throw new Error('RACE FAILED: Neither player obtained the baseball bat!');
  }

  const winner = p1HasBat ? 'Player 1' : 'Player 2';
  const loser = p1HasBat ? 'Player 2' : 'Player 1';
  const winnerRoom = p1HasBat ? room1 : room2;
  const loserRoom = p1HasBat ? room2 : room1;
  console.log(`  Winner: ${winner} (weapon: ${winnerRoom.state.players.get(winnerRoom.sessionId).weapon})`);
  console.log(`  Loser: ${loser} (weapon: ${loserRoom.state.players.get(loserRoom.sessionId).weapon})`);

  // Assert pickup was removed from state on both clients
  await until(
    () => !room1.state.weaponPickups.has(batPickupId) && !room2.state.weaponPickups.has(batPickupId),
    'Bat pickup removed from both clients'
  );
  console.log('  PASS: Checkpoint 2 verified (atomic pickup race arbitrated authoritatively)');

  // -------------------------------------------------------------
  // CHECKPOINT 3: WEAPON SWITCHING & OLD WEAPON DROP
  // -------------------------------------------------------------
  console.log('\n[CHECKPOINT 3] Weapon Switching & Drop');
  let axePickupId = '';
  let axePos = { x: 4.0, z: 3.5 };
  room1.state.weaponPickups.forEach((wp: any, id: string) => {
    if (wp.type === WeaponType.AXE) {
      axePickupId = id;
      axePos = { x: wp.position.x, z: wp.position.z };
    }
  });

  if (!axePickupId) throw new Error('Axe pickup not found');

  console.log(`  Moving ${winner} to Axe pickup at (${axePos.x}, ${axePos.z})...`);
  await movePlayerTo(winnerRoom, axePos, winnerRoom.sessionId);

  console.log(`  ${winner} picking up Axe...`);
  winnerRoom.send('PLAYER_PICKUP', { weaponPickupId: axePickupId, timestamp: Date.now() });

  await until(
    () => winnerRoom.state.players.get(winnerRoom.sessionId).weapon === WeaponType.AXE,
    'Winner equipped Axe'
  );

  // Verify the previously held Baseball Bat was dropped onto the arena
  let droppedBatId = '';
  await until(() => {
    let found = false;
    room1.state.weaponPickups.forEach((wp: any, id: string) => {
      if (wp.type === WeaponType.BASEBALL_BAT) {
        droppedBatId = id;
        found = true;
      }
    });
    return found;
  }, 'Dropped baseball bat pickup spawned');

  const droppedBat = room1.state.weaponPickups.get(droppedBatId);
  console.log(`  Dropped bat spawned at (${droppedBat.position.x.toFixed(2)}, ${droppedBat.position.z.toFixed(2)})`);

  // Loser moves to the dropped bat and picks it up
  console.log(`  Moving ${loser} to dropped Baseball Bat...`);
  await movePlayerTo(loserRoom, { x: droppedBat.position.x, z: droppedBat.position.z }, loserRoom.sessionId);

  console.log(`  ${loser} picking up dropped Baseball Bat...`);
  loserRoom.send('PLAYER_PICKUP', { weaponPickupId: droppedBatId, timestamp: Date.now() });

  await until(
    () => loserRoom.state.players.get(loserRoom.sessionId).weapon === WeaponType.BASEBALL_BAT,
    'Loser equipped dropped Baseball Bat'
  );

  // Both clients must reflect: Winner has AXE, Loser has BASEBALL_BAT
  if (room1.state.players.get(winnerRoom.sessionId).weapon !== WeaponType.AXE ||
      room2.state.players.get(winnerRoom.sessionId).weapon !== WeaponType.AXE) {
    throw new Error('Winner weapon not synced as AXE across both clients');
  }
  if (room1.state.players.get(loserRoom.sessionId).weapon !== WeaponType.BASEBALL_BAT ||
      room2.state.players.get(loserRoom.sessionId).weapon !== WeaponType.BASEBALL_BAT) {
    throw new Error('Loser weapon not synced as BASEBALL_BAT across both clients');
  }
  console.log('  PASS: Checkpoint 3 verified (weapon switching & dropped weapon pickup synchronized)');

  // -------------------------------------------------------------
  // CHECKPOINT 4 & 5: POWER ATTACK SINGLE-USE, FEEL & MULTI-CLIENT SYNCHRONIZATION
  // -------------------------------------------------------------
  console.log('\n[CHECKPOINT 4 & 5] Power Attack Single-Use, Combat Feel & Sync');

  // We will have the player with BASEBALL_BAT perform a Power Attack on an enemy
  // BASEBALL_BAT power damage is 35 (Basic enemy health 50 -> 15 health remaining)
  const batPlayerRoom = loserRoom;
  const targetEnemyId = Array.from(room1.state.enemies.keys())[0];
  console.log(`  Target enemy: ${targetEnemyId}, initial health: ${room1.state.enemies.get(targetEnemyId).health}`);

  console.log(`  Moving Bat Player near enemy ${targetEnemyId}...`);
  await movePlayerNearEnemy(batPlayerRoom, targetEnemyId, batPlayerRoom.sessionId);

  const p1EventsBefore = p1Events.length;
  const p2EventsBefore = p2Events.length;

  console.log('  Executing POWER ATTACK [F] with Baseball Bat (damage: 35)...');
  batPlayerRoom.send('PLAYER_ATTACK', {
    type: AttackType.POWER,
    weapon: WeaponType.BASEBALL_BAT,
    timestamp: Date.now(),
  });

  // Wait for damage to apply
  await until(
    () => (room1.state.enemies.get(targetEnemyId)?.health ?? 50) === 15,
    'Enemy health reduced to 15 (50 - 35)'
  );
  await until(
    () => (room2.state.enemies.get(targetEnemyId)?.health ?? 50) === 15,
    'Enemy health reduced to 15 on Client 2'
  );

  // Authoritative powerAvailable check: must be false on both clients!
  await until(
    () => !room1.state.players.get(batPlayerRoom.sessionId).powerAvailable &&
          !room2.state.players.get(batPlayerRoom.sessionId).powerAvailable,
    'powerAvailable flipped to false on both clients'
  );
  console.log('  Authoritative powerAvailable flipped to FALSE for attacking player');

  // Verify GAME_EVENT enemy_damaged has isPower === true
  await until(() => p1Events.slice(p1EventsBefore).some((e) => e.event === 'enemy_damaged' && e.data?.isPower === true), 'P1 received isPower: true');
  await until(() => p2Events.slice(p2EventsBefore).some((e) => e.event === 'enemy_damaged' && e.data?.isPower === true), 'P2 received isPower: true');
  console.log('  Both clients received enemy_damaged with isPower: true and weapon: baseball_bat');

  // ATTEMPT SECOND POWER ATTACK IN SAME WAVE -> MUST BE REJECTED!
  console.log('  Attempting SECOND power attack in same wave (should be rejected)...');
  await sleep(650); // wait past cooldown
  await movePlayerNearEnemy(batPlayerRoom, targetEnemyId, batPlayerRoom.sessionId);
  batPlayerRoom.send('PLAYER_ATTACK', {
    type: AttackType.POWER,
    weapon: WeaponType.BASEBALL_BAT,
    timestamp: Date.now(),
  });

  await sleep(300);
  const hpAfterRejected = room1.state.enemies.get(targetEnemyId)?.health;
  if (hpAfterRejected !== 15) {
    throw new Error(`Expected enemy health to stay 15 after rejected power attack, got ${hpAfterRejected}`);
  }
  console.log('  PASS: Second power attack rejected authoritatively! Health remained 15');

  // Eliminate target enemy with a LIGHT attack (damage: 20 -> 15 - 20 <= 0 -> KILLED)
  console.log('  Finishing enemy with LIGHT attack (damage: 20)...');
  await movePlayerNearEnemy(batPlayerRoom, targetEnemyId, batPlayerRoom.sessionId);
  batPlayerRoom.send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.BASEBALL_BAT,
    timestamp: Date.now(),
  });

  await until(
    () => !room1.state.enemies.has(targetEnemyId) && !room2.state.enemies.has(targetEnemyId),
    'Target enemy killed and removed from both clients'
  );
  await until(
    () => room1.state.enemiesRemaining === 4 && room2.state.enemiesRemaining === 4,
    'enemiesRemaining decremented to 4 on both clients'
  );
  console.log('  Enemy eliminated, enemiesRemaining: 4 on both clients');

  // Eliminate remaining 4 enemies in Wave 1
  console.log('  Eliminating remaining 4 enemies...');
  while (room1.state.enemies.size > 0) {
    const nextEnemyId = Array.from(room1.state.enemies.keys())[0];
    if (!nextEnemyId) break;

    for (let swing = 1; swing <= 3; swing++) {
      if (!room1.state.enemies.has(nextEnemyId)) break;
      await movePlayerNearEnemy(winnerRoom, nextEnemyId, winnerRoom.sessionId);
      // Winner swings Axe (damage: 25 light)
      winnerRoom.send('PLAYER_ATTACK', {
        type: AttackType.LIGHT,
        weapon: WeaponType.AXE,
        timestamp: Date.now(),
      });
      await sleep(650);
    }
  }

  await until(
    () => room1.state.enemiesRemaining === 0 && room2.state.enemiesRemaining === 0,
    'All Wave 1 enemies defeated'
  );

  // Wave 1 rest period begins
  await until(
    () => room1.state.phase === RoomPhase.LOBBY,
    'Wave 1 complete rest period triggered (phase === lobby)'
  );
  console.log('  Wave 1 completed! Rest period confirmed (phase === lobby)');

  // Skip rest period to advance to Wave 2 immediately
  console.log('  Advancing to Wave 2...');
  serverRoom.waveDirector.skipRestPeriod();

  await until(
    () => room1.state.phase === RoomPhase.GAME && room1.state.currentWave === 2,
    'Wave 2 started (currentWave === 2, phase === game)'
  );

  // VERIFY POWER ATTACK RECHARGE (RESET) ON WAVE ADVANCE
  await until(
    () => room1.state.players.get(batPlayerRoom.sessionId).powerAvailable === true &&
          room2.state.players.get(batPlayerRoom.sessionId).powerAvailable === true,
    'powerAvailable recharged to TRUE for Wave 2 on both clients'
  );
  console.log('  PASS: powerAvailable authoritatively reset to TRUE for all players on Wave 2 start!');

  console.log('\n==================================================');
  console.log('ALL CHECKPOINTS (1 - 5) SUCCESSFULLY VERIFIED!');
  console.log('==================================================');

  await room1.leave();
  await room2.leave();
  await gameServer.gracefullyShutdown();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
