import assert from 'node:assert/strict';
import { GameState, Player, RoomPhase, BossPhase, Difficulty } from '@storm-arena/shared';
import { BossController } from '../src/gameplay/bosses/BossController';

function createRoom() {
  const state = new GameState();
  state.phase = RoomPhase.GAME;
  state.difficulty = Difficulty.NORMAL;
  state.players.set('p1', new Player());
  state.players.set('p2', new Player());
  state.players.get('p1')!.id = 'p1';
  state.players.get('p2')!.id = 'p2';
  const room: any = {
    state,
    broadcast: () => undefined,
  };
  return room;
}

const room = createRoom();
const bossController = new BossController(room);

bossController.spawnBoss(2);
assert.equal(room.state.boss.isActive, true, 'boss should activate on spawn');
assert.equal(room.state.boss.phase, BossPhase.PHASE_1, 'boss starts in phase 1');
assert.ok(room.state.boss.maxHealth > 0, 'boss max health should scale with players');

room.state.boss.health = room.state.boss.maxHealth * 0.75;
bossController.syncPhaseFromHealth();
assert.equal(room.state.boss.phase, BossPhase.PHASE_2, 'boss transitions to phase 2 at 75% remaining');

room.state.boss.health = room.state.boss.maxHealth * 0.50;
bossController.syncPhaseFromHealth();
assert.equal(room.state.boss.phase, BossPhase.PHASE_3, 'boss transitions to phase 3 at 50% remaining');

room.state.boss.health = room.state.boss.maxHealth * 0.19;
bossController.syncPhaseFromHealth();
assert.equal(room.state.boss.phase, BossPhase.ENRAGED, 'boss enters enraged state below 20% life');
assert.equal(room.state.boss.isEnraged, true, 'enraged flag is set');

const defeated = bossController.defeatBoss();
assert.equal(defeated, true, 'boss should be defeated when defeatBoss is called');
assert.equal(room.state.phase, RoomPhase.VICTORY, 'victory phase should be set after boss defeat');

console.log('BOSS SYSTEM: PASS');
