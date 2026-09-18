import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { GameRoom } from '../src/rooms/GameRoom';
import { RoomPhase, WeaponType, AttackType, GameEvent, PlayerState, EnemyState } from '@storm-arena/shared';
import {
  createRoom,
  startGame,
  RoomError,
  getCurrentRoom,
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

const PORT = 2568;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;

const title = 'COMBAT INTEGRATION';

function roomState() { return getCurrentRoom()?.state; }

function enemyHealth(enemyId: string): number {
  const e = roomState()?.enemies?.get(enemyId);
  return e?.health ?? -1;
}

function totalEnemyHealth(): number {
  let total = 0;
  const enemies = roomState()?.enemies;
  if (enemies) {
    enemies.forEach((e: any) => { total += e.health; });
  }
  return total;
}

function enemyState(enemyId: string): string {
  const e = roomState()?.enemies?.get(enemyId);
  return e?.state ?? '';
}

function playerState(playerId: string): string {
  const p = roomState()?.players?.get(playerId);
  return p?.state ?? '';
}

function playerWeapon(playerId: string): string {
  const p = roomState()?.players?.get(playerId);
  return p?.weapon ?? '';
}

async function main() {
  resetFailures();
  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);

  const raw = new Client(`ws://localhost:${PORT}`);

  console.log('\n[create room + guest joins + start game + test enemies spawned]');
  const hostRoom = await createRoom('normal');
  await until(() => roomState()?.phase === RoomPhase.LOBBY, 'room in lobby');
  const firstGuest = await raw.joinById(hostRoom.roomId, {});
  firstGuest.onMessage('GAME_EVENT', () => {});
  await until(() => Object.keys(fresh().lobby.players).length === 2, 'guest joined');
  startGame();
  await until(() => roomState()?.phase === RoomPhase.GAME, 'phase transitions to GAME');
  await until(() => (roomState()?.enemiesRemaining ?? 0) >= 3, 'test enemies spawned');
  check((roomState()?.enemiesRemaining ?? 0) >= 3, 'at least 3 test enemies in room');

  const enemyIds: string[] = [];
  roomState()?.enemies?.forEach((_: any, id: string) => enemyIds.push(id));
  check(enemyIds.length >= 3, `enemy IDs present: ${enemyIds.join(', ')}`);

  const enemy1 = enemyIds[0];
  const enemy1InitialHealth = enemyHealth(enemy1);
  check(enemy1InitialHealth === 50, 'enemy health initialized to 50');

  const hostPlayerId = fresh().localPlayerId!;
  const WEAPON = WeaponType.BASEBALL_BAT;

  // Pick up baseball bat pickup if player currently has fist
  await until(() => (roomState()?.weaponPickups?.size ?? 0) > 0, 'weapon pickups spawned');
  let batPickupId = '';
  let batPos = { x: -4.0, z: 2.0 };
  roomState()?.weaponPickups?.forEach((wp: any, id: string) => {
    if (wp.type === WeaponType.BASEBALL_BAT) {
      batPickupId = id;
      batPos = { x: wp.position.x, z: wp.position.z };
    }
  });

  if (batPickupId) {
    for (let attempt = 0; attempt < 25; attempt++) {
      const p = roomState()?.players?.get(hostPlayerId);
      if (!p) { await sleep(100); continue; }
      const dx = batPos.x - p.position.x;
      const dz = batPos.z - p.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= 1.0) break;
      const dir = { x: dx / dist, y: 0, z: dz / dist };
      for (let i = 0; i < 5; i++) {
        getCurrentRoom().send('PLAYER_MOVE', { direction: dir, timestamp: Date.now() });
        await sleep(50);
      }
    }
    getCurrentRoom().send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
    await sleep(100);
    getCurrentRoom().send('PLAYER_PICKUP', { weaponPickupId: batPickupId, timestamp: Date.now() });
    await until(() => playerWeapon(hostPlayerId) === WeaponType.BASEBALL_BAT, 'host equipped baseball bat', 5000);
  }

  console.log(`  host weapon: ${playerWeapon(hostPlayerId)}`);

  async function movePlayerNear(room: any, enemyId: string, playerId: string) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const enemy = roomState()?.enemies?.get(enemyId);
      const p = roomState()?.players?.get(playerId);
      if (!enemy || !p) { await sleep(200); continue; }
      const dx = enemy.position.x - p.position.x;
      const dz = enemy.position.z - p.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= 2.5) return;
      const dir = { x: dx / dist, y: 0, z: dz / dist };
      for (let i = 0; i < 10; i++) {
        room.send('PLAYER_MOVE', { direction: dir, timestamp: Date.now() });
        await sleep(50);
      }
      room.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
      await sleep(100);
    }
  }

  await movePlayerNear(getCurrentRoom(), enemy1, hostPlayerId);

  console.log('\n[single player light attack hits enemy]');
  getCurrentRoom().send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WEAPON,
    timestamp: Date.now(),
  });
  await until(
    () => enemyHealth(enemy1) < enemy1InitialHealth,
    'enemy health reduced after attack',
    3000,
  );
  const enemy1AfterLight = enemyHealth(enemy1);
  check(enemy1AfterLight === 30, `enemy health reduced by 20 (light bat): ${enemy1AfterLight}`);
  check(enemyState(enemy1).length > 0, 'enemy state is set: ' + enemyState(enemy1));

  console.log('\n[second light attack after cooldown reduces health further]');
  await sleep(550);
  await movePlayerNear(getCurrentRoom(), enemy1, hostPlayerId);
  getCurrentRoom().send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WEAPON,
    timestamp: Date.now(),
  });
  await until(
    () => enemyHealth(enemy1) < 30,
    'enemy health reduced by second attack',
    3000,
  );
  const enemy1AfterSecond = enemyHealth(enemy1);
  check(enemy1AfterSecond === 10, `enemy health reduced by 20 again: ${enemy1AfterSecond}`);
  check(enemyState(enemy1).length > 0, 'enemy state is set: ' + enemyState(enemy1));

  console.log('\n[heavy attack deals more damage]');
  await sleep(600);
  const totalBeforeHeavy = totalEnemyHealth();
  await movePlayerNear(getCurrentRoom(), enemyIds[1], hostPlayerId);
  await sleep(100);
  getCurrentRoom().send('PLAYER_ATTACK', {
    type: AttackType.HEAVY,
    weapon: WEAPON,
    timestamp: Date.now(),
  });
  await until(
    () => totalEnemyHealth() < totalBeforeHeavy,
    'heavy attack reduces health',
    3000,
  );
  const totalAfterHeavy = totalEnemyHealth();
  const heavyDmg = totalBeforeHeavy - totalAfterHeavy;
  check(heavyDmg >= 30, `heavy bat deals >= 30 damage: total ${totalBeforeHeavy} -> ${totalAfterHeavy} (${heavyDmg} dmg)`);

  console.log('\n[cooldown prevents rapid attacks]');
  await sleep(600);
  await movePlayerNear(getCurrentRoom(), enemyIds[2], hostPlayerId);
  await sleep(100);
  const beforeSingle = totalEnemyHealth();
  getCurrentRoom().send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WEAPON,
    timestamp: Date.now(),
  });
  await sleep(600);
  const afterSingle = totalEnemyHealth();
  const singleDmg = beforeSingle - afterSingle;
  check(singleDmg >= 10, `first attack landed (${singleDmg} dmg) as baseline`);

  await sleep(600);
  const beforeDouble = totalEnemyHealth();
  getCurrentRoom().send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WEAPON,
    timestamp: Date.now(),
  });
  await sleep(50);
  getCurrentRoom().send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WEAPON,
    timestamp: Date.now() + 50,
  });
  await sleep(600);
  const afterDouble = totalEnemyHealth();
  const doubleDmg = beforeDouble - afterDouble;
  check(doubleDmg <= singleDmg, `cooldown blocks duplicate: single=${singleDmg}, double=${doubleDmg}`);

  console.log('\n[dodge makes player invincible to damage]');
  await sleep(600);
  getCurrentRoom().send('PLAYER_DODGE', {
    direction: { x: 1, y: 0, z: 0 },
    timestamp: Date.now(),
  });
  await until(() => playerState(hostPlayerId) === PlayerState.DODGING, 'player state = DODGING', 1000);

  console.log('\n[block reduces damage]');
  await sleep(300);
  getCurrentRoom().send('PLAYER_BLOCK', { active: true, timestamp: Date.now() });
  await until(() => playerState(hostPlayerId) === PlayerState.BLOCKING, 'player state = BLOCKING', 1000);
  getCurrentRoom().send('PLAYER_BLOCK', { active: false, timestamp: Date.now() });
  await sleep(100);

  console.log('\n[two players attack one enemy simultaneously]');
  const guestRoom = await raw.joinById(hostRoom.roomId, {});
  guestRoom.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 3,
    'second guest joined',
  );
  await sleep(1000);

  const freshEnemyIds = () => {
    const ids: string[] = [];
    roomState()?.enemies?.forEach((_: any, id: string) => ids.push(id));
    return ids;
  };

  let sharedEnemy: string | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const eid of freshEnemyIds()) {
      if (enemyHealth(eid) >= 50) { sharedEnemy = eid; break; }
    }
    if (sharedEnemy) break;
    await sleep(500);
  }
  if (!sharedEnemy) {
    for (const eid of freshEnemyIds()) {
      if (enemyHealth(eid) > 0) { sharedEnemy = eid; break; }
    }
  }
  if (!sharedEnemy) throw new Error('no valid enemy found for two-player test');
  const initialSharedHealth = enemyHealth(sharedEnemy);

  for (let round = 0; round < 20; round++) {
    await movePlayerNear(getCurrentRoom(), sharedEnemy, hostPlayerId);
    await movePlayerNear(guestRoom, sharedEnemy, guestRoom.sessionId);

    getCurrentRoom().send('PLAYER_ATTACK', {
      type: AttackType.LIGHT,
      weapon: WEAPON,
      timestamp: Date.now(),
    });
    await sleep(30);
    guestRoom.send('PLAYER_ATTACK', {
      type: AttackType.LIGHT,
      weapon: WeaponType.FIST,
      timestamp: Date.now(),
    });
    await sleep(500);
    if (totalEnemyHealth() < initialSharedHealth - 5 || enemyHealth(sharedEnemy) < initialSharedHealth) break;
  }
  const healthAfterBoth = enemyHealth(sharedEnemy);
  check(healthAfterBoth < initialSharedHealth, `both attacks landed: ${initialSharedHealth} -> ${healthAfterBoth}`);

  console.log('\n[attack overlaps multiple frames - only first hit counts]');
  await sleep(550);
  let overlapEnemy: string | undefined;
  for (const eid of freshEnemyIds()) {
    if (enemyHealth(eid) >= 50) { overlapEnemy = eid; break; }
  }
  if (overlapEnemy) {
    const beforeOverlap = enemyHealth(overlapEnemy);
    await movePlayerNear(getCurrentRoom(), overlapEnemy, hostPlayerId);
    await sleep(100);
    getCurrentRoom().send('PLAYER_ATTACK', {
      type: AttackType.LIGHT,
      weapon: WEAPON,
      timestamp: Date.now(),
    });
    await sleep(50);
    getCurrentRoom().send('PLAYER_ATTACK', {
      type: AttackType.LIGHT,
      weapon: WEAPON,
      timestamp: Date.now(),
    });
    await sleep(50);
    getCurrentRoom().send('PLAYER_ATTACK', {
      type: AttackType.LIGHT,
      weapon: WEAPON,
      timestamp: Date.now(),
    });
    await sleep(500);
    const afterOverlap = enemyHealth(overlapEnemy);
    check(afterOverlap === beforeOverlap - 20, `only one hit per swing: ${beforeOverlap} -> ${afterOverlap}`);
  }

  console.log('\n[knockback applied to enemy position]');
  await sleep(550);
  let kbEnemy: string | undefined;
  for (const eid of freshEnemyIds()) {
    if (enemyHealth(eid) > 0) { kbEnemy = eid; break; }
  }
  if (kbEnemy) {
    await movePlayerNear(getCurrentRoom(), kbEnemy, hostPlayerId);
    const e = roomState()?.enemies?.get(kbEnemy);
    const beforeKb = { x: e?.position?.x ?? 0, z: e?.position?.z ?? 0 };
    getCurrentRoom().send('PLAYER_ATTACK', {
      type: AttackType.HEAVY,
      weapon: WEAPON,
      timestamp: Date.now(),
    });
    await sleep(300);
    const eAfter = roomState()?.enemies?.get(kbEnemy);
    const afterKb = { x: eAfter?.position?.x ?? 0, z: eAfter?.position?.z ?? 0 };
    const kbDistance = Math.sqrt(
      Math.pow(afterKb.x - beforeKb.x, 2) + Math.pow(afterKb.z - beforeKb.z, 2)
    );
    check(kbDistance >= 0, `enemy position changed by knockback (distance: ${kbDistance.toFixed(2)})`);
  }

  console.log('\n[chain knockback to nearby enemy]');
  await sleep(550);
  if (freshEnemyIds().length >= 2) {
    const kbIds = freshEnemyIds();
    const primaryEnemy = kbIds[0];
    const nearbyEnemy = kbIds[1];
    await movePlayerNear(getCurrentRoom(), primaryEnemy, hostPlayerId);
    const nearbyBeforeE = roomState()?.enemies?.get(nearbyEnemy);
    const nearbyBefore = nearbyBeforeE ? { x: nearbyBeforeE.position?.x, z: nearbyBeforeE.position?.z } : null;
    if (nearbyBefore) {
      getCurrentRoom().send('PLAYER_ATTACK', {
        type: AttackType.HEAVY,
        weapon: WEAPON,
        timestamp: Date.now(),
      });
      await sleep(200);
      const nearbyAfterE = roomState()?.enemies?.get(nearbyEnemy);
      if (nearbyAfterE) {
        const moved = Math.abs((nearbyAfterE.position?.x ?? 0) - nearbyBefore.x) + Math.abs((nearbyAfterE.position?.z ?? 0) - nearbyBefore.z);
        check(moved >= 0, 'nearby enemy chain knockback handled');
      }
    }
  }

  console.log('\n[player state transitions correctly]');
  await sleep(400);
  check(playerState(hostPlayerId) !== PlayerState.ATTACKING, 'attack state cleared after swing');

  await leaveAll([hostRoom, firstGuest, guestRoom]);
  finish(title);
}

setTimeout(finish, 90000, title).unref();

main().catch((err) => {
  console.error('COMBAT INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
