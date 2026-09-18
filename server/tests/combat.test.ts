import { PositionHistory } from '../src/lag/PositionHistory';
import { HitboxSystem } from '../src/gameplay/combat/HitboxSystem';
import { DamageSystem } from '../src/gameplay/combat/DamageSystem';
import { KnockbackSystem } from '../src/gameplay/combat/KnockbackSystem';
import { GameRoom } from '../src/rooms/GameRoom';
import { Difficulty, WeaponType, AttackType, EnemyState, RoomPhase } from '@storm-arena/shared';

let failures: string[] = [];

function resetFailures() {
  failures = [];
}

function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

function finish(title: string) {
  console.log(
    failures.length === 0 ? `\nALL ${title} PASSED` : `\n${failures.length} ${title} TESTS FAILED`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  resetFailures();

  console.log('\n[PositionHistory]');
  const history = new PositionHistory();
  history.record('enemy-1', { x: 5, y: 0, z: 0 }, 1000);
  history.record('enemy-1', { x: 5.1, y: 0, z: 0.1 }, 1050);
  history.record('enemy-1', { x: 5.2, y: 0, z: 0.2 }, 1100);

  const snap1 = history.getSnapshotAt('enemy-1', 1075);
  check(snap1 !== null && snap1.timestamp === 1050, 'getSnapshotAt returns closest past snapshot');

  const snap2 = history.getSnapshotAt('enemy-1', 900);
  check(snap2 !== null && snap2.timestamp === 1100, 'getSnapshotAt returns most recent if target before history');

  const snap3 = history.getSnapshotAt('enemy-2', 1000);
  check(snap3 === null, 'getSnapshotAt returns null for unknown entity');

  history.clear('enemy-1');
  check(history.getSnapshotAt('enemy-1', 1000) === null, 'clear removes entity history');

  console.log('\n[HitboxSystem]');
  const hsHistory = new PositionHistory();
  const hitbox = new HitboxSystem(hsHistory);

  const active = hitbox.startAttack('player-1', { x: 0, y: 0, z: 0 }, WeaponType.FIST, 'light', 1000, 0);
  check(active.attackerId === 'player-1' && active.weaponType === WeaponType.FIST, 'startAttack creates hitbox with correct data');
  check(active.hitEnemies.size === 0, 'hitEnemies set starts empty');

  hsHistory.record('enemy-1', { x: 0.5, y: 0, z: 0 }, 1000);
  const hits1 = hitbox.checkHits('player-1', new Map([['enemy-1', { position: { x: 0.5, y: 0, z: 0 }, id: 'enemy-1', health: 50 }]]), 0, 1000);
  check(hits1.length === 1 && hits1[0].enemyId === 'enemy-1', 'hit detected within fist radius (1.5)');

  const hits2 = hitbox.checkHits('player-1', new Map([['enemy-1', { position: { x: 0.5, y: 0, z: 0 }, id: 'enemy-1', health: 50 }]]), 0, 1000);
  check(hits2.length === 0, 'second checkHit on same enemy returns no hit (one-hit-per-swing)');

  hsHistory.record('enemy-2', { x: 3, y: 0, z: 0 }, 1000);
  const hits3 = hitbox.checkHits('player-1', new Map([['enemy-2', { position: { x: 3, y: 0, z: 0 }, id: 'enemy-2', health: 50 }]]), 0, 1000);
  check(hits3.length === 0, 'enemy outside fist radius not hit');

  hitbox.update(2, 1000);
  check(hitbox.getActiveHitboxes().length === 1, 'hitbox active at tick 2 (elapsedTicks=2 < activeFrames=3)');
  hitbox.update(3, 1000);
  check(hitbox.getActiveHitboxes().length === 0, 'hitbox deactivated at tick 3 (elapsedTicks=3 >= activeFrames=3)');

  hitbox.clearAttackerHitboxes('player-1');
  check(hitbox.getActiveHitboxes().length === 0, 'clearAttackerHitboxes removes hitboxes');

  console.log('\n[DamageSystem]');
  const dmg = new DamageSystem();

  const enemy1 = { health: 50, maxHealth: 50, state: EnemyState.IDLE, id: 'e1' };
  const result1 = dmg.applyDamage(enemy1, WeaponType.FIST, AttackType.LIGHT);
  check(result1.damageDealt === 10, 'fist light damage = 10 (base 10 * 1.0)');
  check(result1.newHealth === 40, 'health reduced correctly');
  check(!result1.killed, 'not killed at 40 health');

  const enemy2 = { health: 10, maxHealth: 50, state: EnemyState.IDLE, id: 'e2' };
  const result2 = dmg.applyDamage(enemy2, WeaponType.FIST, AttackType.LIGHT);
  check(result2.killed, 'killed when health <= 0');
  check(result2.stateChange === EnemyState.DEAD, 'state changes to DEAD on kill');

  const enemy3 = { health: 50, maxHealth: 50, state: EnemyState.IDLE, id: 'e3' };
  const result3 = dmg.applyDamage(enemy3, WeaponType.FIST, AttackType.HEAVY);
  check(result3.damageDealt === 15, 'fist heavy damage = 15 (base 10 * 1.5)');
  check(result3.stateChange === EnemyState.STAGGER, 'state changes to STAGGER on non-kill');

  const player = { health: 100, maxHealth: 100, isBlocking: true, state: 'blocking', id: 'p1' };
  const pResult = dmg.applyPlayerDamage(player, 20);
  check(pResult.newHealth === 90, 'block reduces damage by 50% (20 -> 10)');

  const player2 = { health: 100, maxHealth: 100, isBlocking: false, state: 'idle', id: 'p2' };
  const pResult2 = dmg.applyPlayerDamage(player2, 20);
  check(pResult2.newHealth === 80, 'no block = full damage');

  console.log('\n[KnockbackSystem]');
  const kb = new KnockbackSystem();

  const kb1 = kb.applyKnockback(
    { x: 5, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    WeaponType.FIST,
    AttackType.LIGHT
  );
  check(kb1.position.x > 5, 'knockback pushes enemy away from attacker');
  check(kb1.position.x <= 20, 'knockback clamped at boundary');

  const kb2 = kb.applyKnockback(
    { x: 20, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    WeaponType.HAMMER,
    AttackType.HEAVY
  );
  check(kb2.position.x === 20, 'wall impact: position clamped at MOVEMENT_BOUNDARY');

  const kb3 = kb.applyKnockback(
    { x: 10, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    WeaponType.FIST,
    AttackType.LIGHT
  );
  check(kb3.velocity.x > 0, 'knockback returns velocity vector');

  const chain = kb.applyChainKnockback(
    { x: 5, y: 0, z: 0 },
    [
      { id: 'e1', position: { x: 6, y: 0, z: 0 } },
      { id: 'e2', position: { x: 10, y: 0, z: 0 } },
    ],
    WeaponType.FIST,
    AttackType.LIGHT
  );
  check(chain.length === 1, 'chain knockback affects enemy within 2.5 units');
  check(chain[0].id === 'e1', 'correct enemy affected by chain');

  console.log('\n[Input validation]');
  const gameRoom = new GameRoom() as any;
  gameRoom.listing = { metadata: {}, remove: () => undefined };
  gameRoom.broadcast = () => undefined;
  gameRoom.onCreate({ difficulty: Difficulty.NORMAL });
  gameRoom.onJoin({ sessionId: 'p1' });

  const validMove = gameRoom.normalizeMoveInput({
    direction: { x: 0.5, y: 0, z: 0.5 },
    rotation: { x: 0, y: 0.5, z: 0 },
    timestamp: 1000,
  });
  check(validMove !== null && validMove.direction.x === 0.5, 'valid movement payload accepted');

  const invalidMove = gameRoom.normalizeMoveInput({
    direction: { x: 99, y: 0, z: 0 },
    timestamp: 1001,
  });
  check(invalidMove === null, 'impossible movement magnitude rejected');

  const nanMove = gameRoom.normalizeMoveInput({
    direction: { x: NaN, y: 0, z: 0 },
    timestamp: 1002,
  });
  check(nanMove === null, 'NaN direction rejected');

  const invalidAttack = gameRoom.validateAttackPayload({
    type: 'light',
    weapon: 'hammer',
    timestamp: Date.now(),
  }, 'p1');
  check(invalidAttack === false, 'invalid weapon claim rejected');

  const validAttack = gameRoom.validateAttackPayload({
    type: 'light',
    weapon: 'fist',
    timestamp: Date.now(),
  }, 'p1');
  check(validAttack === true, 'valid attack payload accepted');

  check(gameRoom.detectSpeedHack('p1', { x: 50, y: 0, z: 0 }, 50) === true, 'speed hack detected');

  check(gameRoom.state.phase === RoomPhase.LOBBY, 'room starts in lobby');

  finish('COMBAT UNIT');
}

main().catch((err) => {
  console.error('COMBAT UNIT TEST FAILED:', err);
  process.exit(1);
});