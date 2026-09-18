import { EnemyAI, createEnemyAIState } from '../src/gameplay/enemies/EnemyAI';
import { EnemySystem } from '../src/gameplay/enemies/EnemySystem';
import { EnemyType, EnemyState, Difficulty } from '@storm-arena/shared';
import { Room } from 'colyseus';
import { GameState, Enemy, Player } from '@storm-arena/shared';

let failures: string[] = [];

function resetFailures() { failures = []; }
function check(cond: boolean, msg: string) {
  if (cond) console.log('  PASS:', msg);
  else { console.log('  FAIL:', msg); failures.push(msg); }
}
function finish(title: string) {
  console.log(failures.length === 0 ? `\nALL ${title} PASSED` : `\n${failures.length} ${title} TESTS FAILED`);
  process.exit(failures.length === 0 ? 0 : 1);
}

const mockRoom = {
  state: new GameState(),
  broadcast: () => {},
} as unknown as Room<GameState>;

mockRoom.state.players.clear();
mockRoom.state.enemies.clear();

function createMockPlayer(id: string, x: number, z: number, alive = true): Player {
  const p = new Player();
  p.id = id;
  p.sessionId = id;
  p.position.x = x;
  p.position.z = z;
  p.isAlive = alive;
  p.health = 100;
  return p;
}

async function main() {
  resetFailures();

  console.log('\n[EnemyAI - State Machine]');
  const aiState = createEnemyAIState('test-1', EnemyType.BASIC, { x: 0, y: 0, z: 0 }, {
    maxHealth: 50, speed: 3, attackRange: 1.5, detectionRange: 12, attackCooldown: 1500, knockbackResistance: 1, damage: 10,
  });
  const ai = new EnemyAI();

  check(ai.getState() === 'IDLE', 'initial state is IDLE');

  const targetMap = new Map();
  targetMap.set('player-1', { position: { x: 5, y: 0, z: 0 }, health: 100 });
  
  const ctxNoTarget = { enemy: aiState, players: new Map(), currentTime: 1000, tick: 0 };
  ai.update(ctxNoTarget);
  check(ai.getState() === 'IDLE', 'stays IDLE with no target');

  const ctxWithTarget = { enemy: { ...aiState, position: { x: 0, y: 0, z: 0 } }, players: targetMap, currentTime: 1000, tick: 0 };
  ai.update(ctxWithTarget);
  check(ai.getState() === 'DETECT', 'transitions to DETECT when target in detection range');

  const ctxClose = { enemy: { ...aiState, position: { x: 0, y: 0, z: 0 } }, players: targetMap, currentTime: 2000, tick: 0 };
  ai.update(ctxClose);
  check(ai.getState() === 'CHASE', 'transitions to CHASE');

  const ctxAttack = { enemy: { ...aiState, position: { x: 4, y: 0, z: 0 } }, players: targetMap, currentTime: 3000, tick: 0 };
  ai.update(ctxAttack);
  check(ai.getState() === 'ATTACK', 'transitions to ATTACK when in attack range');

  ai.applyStagger(500, 5000);
  check(ai.getState() === 'STAGGER', 'applyStagger sets STAGGER');

  const ctxStaggerEnd = { enemy: aiState, players: targetMap, currentTime: 5600, tick: 0 };
  ai.update(ctxStaggerEnd);
  check(ai.getState() === 'RECOVER', 'exits STAGGER to RECOVER after duration');

  const ctxDead = { enemy: { ...aiState, health: 0 }, players: new Map(), currentTime: 1000, tick: 0 };
  const ai2 = new EnemyAI();
  ai2.update(ctxDead);
  check(ai2.getState() === 'DEAD', 'health <= 0 sets DEAD state');

  const aiTransitions = new EnemyAI();
  check(!aiTransitions.setState('ATTACK'), 'invalid transition IDLE->ATTACK rejected');
  check(aiTransitions.setState('DETECT'), 'valid transition IDLE->DETECT allowed');

  console.log('\n[EnemySystem - Spawning & Waves]');
  const sys = new EnemySystem(mockRoom);
  sys.startWave(1, 'normal');
  check(sys.getEnemies().size >= 3, 'wave 1 spawns at least 3 enemies');
  check(sys.getCurrentWave() === 1, 'current wave set correctly');

  const enemyIds = Array.from(sys.getEnemies().keys());
  const firstEnemy = sys.getEnemies().get(enemyIds[0])!;
  check(firstEnemy.schema.health === firstEnemy.schema.maxHealth, 'enemy health = maxHealth on spawn');
  check(firstEnemy.schema.state === EnemyState.IDLE, 'enemy starts IDLE');

  sys.startWave(5, 'hard');
  check(sys.getEnemies().size > 0, 'wave 5 spawns enemies');
  check(sys.getCurrentWave() === 5, 'wave updated');

  const wave5EnemyIds = Array.from(sys.getEnemies().keys());

  console.log('\n[EnemySystem - Target Selection]');
  const target1 = createMockPlayer('p1', 5, 0);
  const target2 = createMockPlayer('p2', 15, 0);
  mockRoom.state.players.set('p1', target1);
  mockRoom.state.players.set('p2', target2);

  const testEnemy = sys.getEnemies().get(wave5EnemyIds[0])!;
  testEnemy.schema.position.x = 0;
  testEnemy.schema.position.z = 0;
  testEnemy.aiState.position.x = 0;
  testEnemy.aiState.position.z = 0;

  sys.update(50);
  check(testEnemy.aiState.targetPlayerId === 'p1', 'selects closest player in range');

  console.log('\n[EnemySystem - Movement]');
  const initialX = testEnemy.schema.position.x;
  sys.update(50);
  check(testEnemy.schema.position.x !== initialX, 'enemy moves towards target');

  console.log('\n[EnemySystem - Damage & Death]');
  const damageEnemy = sys.getEnemies().get(wave5EnemyIds[0])!;
  const died = sys.applyDamage(damageEnemy.schema.id, 1000, { x: 0, y: 0, z: 0 }, false);
  check(died === true, 'applyDamage returns true on kill');
  check(!sys.getEnemies().has(damageEnemy.schema.id), 'dead enemy removed from map');

  console.log('\n[EnemySystem - Stagger & Knockback]');
  const staggerEnemy = sys.getEnemies().get(wave5EnemyIds[1])!;
  sys.applyDamage(staggerEnemy.schema.id, 10, { x: 0, y: 0, z: 0 }, false);
  check(staggerEnemy.ai.getState() === 'STAGGER', 'damage applies stagger');

  const kbEnemy = sys.getEnemies().get(wave5EnemyIds[2])!;
  const beforeKb = { ...kbEnemy.schema.position };
  sys.applyDamage(kbEnemy.schema.id, 1, { x: kbEnemy.schema.position.x - 5, y: 0, z: kbEnemy.schema.position.z }, true);
  check(kbEnemy.ai.getState() === 'KNOCKBACK', 'heavy attack applies knockback');
  const moved = Math.abs(kbEnemy.schema.position.x - beforeKb.x) + Math.abs(kbEnemy.schema.position.z - beforeKb.z);
  check(moved > 0, 'knockback moves enemy position');

  console.log('\n[EnemySystem - Wave Complete]');
  check(sys.isWaveComplete() === false, 'wave not complete with living enemies');
  sys.clearAll();
  check(sys.isWaveComplete() === true, 'wave complete after clearAll');

  console.log('\n[EnemyTypes - Scaling]');
  const { createEnemyConfig, scaleEnemyForWave, getDifficultyMultiplier } = await import('../src/gameplay/enemies/EnemyTypes');
  const cfg = createEnemyConfig(EnemyType.BASIC);
  check(cfg.maxHealth === 50, 'base config health = 50');
  const scaled = scaleEnemyForWave({ ...cfg }, 5, 1.3);
  check(scaled.maxHealth > cfg.maxHealth, 'wave scaling increases health');

  check(getDifficultyMultiplier('easy') === 0.8, 'easy multiplier = 0.8');
  check(getDifficultyMultiplier('normal') === 1.0, 'normal multiplier = 1.0');
  check(getDifficultyMultiplier('hard') === 1.3, 'hard multiplier = 1.3');

  finish('ENEMY');
}

main().catch((err) => {
  console.error('ENEMY TEST FAILED:', err);
  process.exit(1);
});