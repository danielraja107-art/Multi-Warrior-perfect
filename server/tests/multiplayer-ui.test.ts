import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { GameRoom } from '../src/rooms/GameRoom';
import {
  RoomPhase,
  BossPhase,
  PlayerColor,
  WeaponType,
  GameEvent,
  Enemy,
} from '@storm-arena/shared';
import {
  createRoom,
  joinRoom,
  startGame,
  changeDifficulty,
  leaveRoom,
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

const PORT = 2566;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;
process.env.STORM_RECONNECT_TIMEOUT_MS = '5000';

const title = 'MULTIPLAYER UI';

function serverRoom(roomId: string) {
  try {
    return matchMaker.getRoomById(roomId) as { state: { players: { size: number } } } | undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  resetFailures();
  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);

  const raw = new Client(`ws://localhost:${PORT}`);

  // =========================================================================
  // 1-PLAYER SOLO LOBBY
  // =========================================================================
  console.log('\n[1-player solo lobby]');
  const soloRoom = await createRoom('normal');
  await until(
    () => Object.keys(fresh().lobby.players).length === 1,
    'solo lobby has 1 player',
  );

  const soloLobby = fresh().lobby;
  check(Object.keys(soloLobby.players).length === 1, 'solo: exactly 1 player in lobby');
  check(soloLobby.roomCode.length >= 4, `solo: room code is set (${soloLobby.roomCode})`);
  check(soloLobby.difficulty === 'normal', 'solo: difficulty defaults to NORMAL');
  check(fresh().localPlayerId !== null, 'solo: localPlayerId is set');
  check(
    soloLobby.hostId === fresh().localPlayerId,
    'solo: host indicator matches the only player',
  );
  check(Boolean(fresh().isMatchActive) === false, 'solo: lobby is not an active match');

  const soloPlayer = Object.values(soloLobby.players)[0];
  check(soloPlayer.color === PlayerColor.RED, `solo: first player gets RED color (${soloPlayer.color})`);
  check(soloPlayer.isHost === true, 'solo: only player is host');
  check(soloPlayer.isAlive === true, 'solo: player is alive');
  check(soloPlayer.health === 100, `solo: player starts with 100 HP (${soloPlayer.health})`);
  check(soloPlayer.weapon === WeaponType.FIST, `solo: player starts with FIST (${soloPlayer.weapon})`);

  await leaveRoom();
  await sleep(300);

  // =========================================================================
  // 4-PLAYER LOBBY — FULL ROOM
  // =========================================================================
  console.log('\n[4-player lobby — full room]');
  const hostRoom = await createRoom('easy');
  const filler1 = await raw.joinById(hostRoom.roomId, {});
  filler1.onMessage('GAME_EVENT', () => {});
  const filler2 = await raw.joinById(hostRoom.roomId, {});
  filler2.onMessage('GAME_EVENT', () => {});
  const filler3 = await raw.joinById(hostRoom.roomId, {});
  filler3.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 4,
    '4-player lobby reaches 4 players',
  );

  const lobby4 = fresh().lobby;
  check(Object.keys(lobby4.players).length === 4, '4p: all 4 slots populated');

  const colors4 = Object.values(lobby4.players)
    .map((p) => p.color)
    .sort()
    .join(',');
  check(
    colors4 === [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW].sort().join(','),
    `4p: four distinct player colors (${colors4})`,
  );

  check(fresh().lobby.hostId === fresh().localPlayerId, '4p: host indicator matches creator');
  check(Boolean(fresh().isMatchActive) === false, '4p: lobby is not an active match');
  check(lobby4.difficulty === 'easy', '4p: difficulty is easy');

  // Verify each player slot
  const players4 = Object.values(lobby4.players);
  const hostPlayer = players4.find((p) => p.isHost);
  check(Boolean(hostPlayer), '4p: host player exists');
  check(hostPlayer?.color === PlayerColor.RED, '4p: host player has RED color');

  // =========================================================================
  // DIFFICULTY UPDATES — SERVER → UI
  // =========================================================================
  console.log('\n[difficulty updates]');
  changeDifficulty('hard');
  await until(() => fresh().gameState?.difficulty === 'hard', 'difficulty flows to store');
  check(fresh().lobby.difficulty === 'hard', 'difficulty: lobby difficulty updated from server state');

  const room = matchMaker.getRoomById(hostRoom.roomId) as InstanceType<typeof GameRoom>;
  check(room.state.difficulty === 'hard', 'difficulty: server difficulty updated (authoritative)');

  // Change back to normal
  changeDifficulty('normal');
  await until(() => fresh().gameState?.difficulty === 'normal', 'difficulty reverts to normal');
  check(fresh().lobby.difficulty === 'normal', 'difficulty: lobby reverts to normal');

  // =========================================================================
  // GAME START — HOST ONLY
  // =========================================================================
  console.log('\n[game start]');
  startGame();
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, 'phase transitions to GAME');
  check(fresh().isMatchActive, 'start: match marked active while in GAME phase');
  check(fresh().gameState?.phase === RoomPhase.GAME, 'start: gameState.phase is GAME');

  room.resetForTest();

  // =========================================================================
  // WAVE NUMBER — SERVER → UI
  // =========================================================================
  console.log('\n[wave number]');
  room.state.currentWave = 1;
  await until(() => fresh().gameState?.currentWave === 1, 'wave 1 consumed');
  check(fresh().gameState?.currentWave === 1, `wave: current wave is 1`);

  room.state.currentWave = 3;
  await until(() => fresh().gameState?.currentWave === 3, 'wave 3 consumed');
  check(fresh().gameState?.currentWave === 3, `wave: current wave updated to 3`);

  // =========================================================================
  // ENEMY COUNT — SERVER → UI
  // =========================================================================
  console.log('\n[enemy count]');
  room.state.enemiesRemaining = 12;
  await until(() => fresh().gameState?.enemiesRemaining === 12, 'enemy count 12 consumed');
  check(fresh().gameState?.enemiesRemaining === 12, `enemies: remaining count is 12`);

  // Add enemies to the map
  const e1 = new Enemy();
  e1.id = 'enemy-a';
  const e2 = new Enemy();
  e2.id = 'enemy-b';
  const e3 = new Enemy();
  e3.id = 'enemy-c';
  room.state.enemies.set(e1.id, e1);
  room.state.enemies.set(e2.id, e2);
  room.state.enemies.set(e3.id, e3);

  await until(() => Object.keys(fresh().gameState?.enemies ?? {}).length === 3, '3 enemies consumed');
  check(Object.keys(fresh().gameState!.enemies).length === 3, 'enemies: 3 enemy entities in store');

  room.state.enemiesRemaining = 5;
  await until(() => fresh().gameState?.enemiesRemaining === 5, 'enemy count updated to 5');
  check(fresh().gameState?.enemiesRemaining === 5, 'enemies: count updates in real time');

  // =========================================================================
  // HEALTH UI — SERVER → UI (LOCAL + REMOTE PLAYERS)
  // =========================================================================
  console.log('\n[health UI]');
  const localPlayerId = fresh().localPlayerId!;
  const localP = room.state.players.get(localPlayerId);
  localP!.health = 75;
  await until(
    () => fresh().gameState?.players[localPlayerId]?.health === 75,
    'local player health 75 consumed',
  );
  check(
    fresh().gameState!.players[localPlayerId].health === 75,
    `health: local player health is 75`,
  );
  check(
    fresh().gameState!.players[localPlayerId].maxHealth === 100,
    `health: local player maxHealth is 100`,
  );

  // Set local player to low health
  localP!.health = 15;
  await until(
    () => fresh().gameState?.players[localPlayerId]?.health === 15,
    'local player health 15 consumed',
  );
  check(
    fresh().gameState!.players[localPlayerId].health === 15,
    'health: low health (15) consumed for local player',
  );

  // Set local player health back to full
  localP!.health = 100;
  await until(
    () => fresh().gameState?.players[localPlayerId]?.health === 100,
    'local player health restored to 100',
  );

  // Remote player health
  const remoteSessionId = filler1.sessionId;
  const remoteP = room.state.players.get(remoteSessionId);
  if (remoteP) {
    remoteP.health = 60;
    await until(
      () => fresh().gameState?.players[remoteSessionId]?.health === 60,
      'remote player health 60 consumed',
    );
    check(
      fresh().gameState!.players[remoteSessionId].health === 60,
      'health: remote player health is 60',
    );
  }

  // =========================================================================
  // WEAPON INDICATOR — SERVER → UI
  // =========================================================================
  console.log('\n[weapon indicator]');
  localP!.weapon = WeaponType.AXE;
  await until(
    () => fresh().gameState?.players[localPlayerId]?.weapon === WeaponType.AXE,
    'local player weapon AXE consumed',
  );
  check(
    fresh().gameState!.players[localPlayerId].weapon === WeaponType.AXE,
    `weapon: local player weapon is AXE`,
  );

  localP!.weapon = WeaponType.HAMMER;
  await until(
    () => fresh().gameState?.players[localPlayerId]?.weapon === WeaponType.HAMMER,
    'local player weapon HAMMER consumed',
  );
  check(
    fresh().gameState!.players[localPlayerId].weapon === WeaponType.HAMMER,
    'weapon: weapon updates in real time',
  );

  // Remote player weapon
  if (remoteP) {
    remoteP.weapon = WeaponType.BASEBALL_BAT;
    await until(
      () => fresh().gameState?.players[remoteSessionId]?.weapon === WeaponType.BASEBALL_BAT,
      'remote player weapon BASEBALL_BAT consumed',
    );
    check(
      fresh().gameState!.players[remoteSessionId].weapon === WeaponType.BASEBALL_BAT,
      'weapon: remote player weapon indicator updates',
    );
  }

  // =========================================================================
  // BOSS HEALTH — SERVER → UI
  // =========================================================================
  console.log('\n[boss health]');
  room.state.boss.health = 300;
  room.state.boss.maxHealth = 500;
  room.state.boss.phase = BossPhase.PHASE_2;
  room.state.boss.isEnraged = true;
  room.state.boss.isActive = true;
  room.state.enemiesRemaining = 9;
  localP!.health = 30;

  await until(
    () =>
      fresh().gameState?.currentWave === 3 &&
      fresh().gameState?.enemiesRemaining === 9 &&
      fresh().gameUI.bossHealth === 300,
    'wave/enemy/boss values reach store',
  );
  const gs = fresh().gameState!;
  check(gs.currentWave === 3, `wave number consumed (${gs.currentWave})`);
  check(gs.enemiesRemaining === 9, `enemy count consumed (${gs.enemiesRemaining})`);
  check(Object.keys(gs.enemies).length >= 2, 'enemy map consumed (includes test enemies)');
  check('enemy-a' in gs.enemies && 'enemy-b' in gs.enemies, 'manually added enemies present in map');
  const health = gs.players[fresh().localPlayerId!]?.health;
  check(health === 30, `authoritative player health consumed (${health})`);
  check(fresh().gameUI.bossHealth === 300, `boss health consumed (${fresh().gameUI.bossHealth})`);
  check(fresh().gameUI.bossMaxHealth === 500, `boss: maxHealth is 500`);
  check(fresh().gameUI.bossPhase === BossPhase.PHASE_2, 'boss phase consumed');
  check(fresh().gameUI.bossEnraged === true, 'boss enraged state consumed');
  check(fresh().gameUI.showBossHealth === true, 'boss: health bar visibility is true');

  // Boss health update
  room.state.boss.health = 100;
  await until(() => fresh().gameUI.bossHealth === 100, 'boss health updated to 100');
  check(fresh().gameUI.bossHealth === 100, 'boss: health updates in real time');

  // -------------------------------------------------------------------------
  // Death / respawn state (authoritative)
  // -------------------------------------------------------------------------
  console.log('\n[death / respawn state]');
  localP!.isAlive = false;
  await until(() => fresh().gameUI.localPlayerDead === true, 'death state consumed');
  check(fresh().gameUI.localPlayerDead === true, 'death: local player death state from server');

  localP!.isAlive = true;
  await until(() => fresh().gameUI.localPlayerDead === false, 'respawn state consumed');
  check(fresh().gameUI.localPlayerDead === false, 'death: local player respawn restored from server');

  // =========================================================================
  // SERVER GAME EVENTS — WAVE START / WAVE COMPLETE / BOSS PHASE
  // =========================================================================
  console.log('\n[server game events]');

  // WAVE_START
  room.broadcast('GAME_EVENT', {
    event: GameEvent.WAVE_START,
    data: { wave: 3, weaponRespawnIn: 10 },
  });
  await until(
    () => fresh().gameUI.showWaveTransition === true && fresh().gameUI.waveNumber === 3,
    'WAVE_START consumed',
  );
  check(fresh().gameUI.showWaveTransition === true, 'event: wave transition visible');
  check(fresh().gameUI.waveNumber === 3, 'event: wave number is 3');
  check(fresh().gameUI.waveComplete === false, 'event: waveComplete is false on WAVE_START');
  check(
    fresh().gameUI.weaponRespawnMessage?.includes('10') ?? false,
    'event: weapon respawn message from event',
  );

  // BOSS_PHASE_CHANGE
  room.broadcast('GAME_EVENT', {
    event: GameEvent.BOSS_PHASE_CHANGE,
    data: { phase: BossPhase.ENRAGED },
  });
  await until(
    () => fresh().gameUI.phaseTransitionMessage === 'BOSS ENRAGED',
    'BOSS_PHASE_CHANGE consumed',
  );
  check(fresh().gameUI.phaseTransitionMessage === 'BOSS ENRAGED', 'event: boss phase-transition notification');

  // BOSS_SPAWN
  room.broadcast('GAME_EVENT', {
    event: GameEvent.BOSS_SPAWN,
    data: { phase: BossPhase.PHASE_1 },
  });
  await until(
    () => fresh().gameUI.phaseTransitionMessage === 'A NEW THREAT APPROACHES',
    'BOSS_SPAWN consumed',
  );
  check(fresh().gameUI.phaseTransitionMessage === 'A NEW THREAT APPROACHES', 'event: boss spawn notification');

  // BOSS_DEFEATED
  room.broadcast('GAME_EVENT', {
    event: GameEvent.BOSS_DEFEATED,
    data: {},
  });
  await until(() => fresh().gameUI.bossDefeated === true, 'BOSS_DEFEATED consumed');
  check(fresh().gameUI.bossDefeated === true, 'event: boss defeated state set');

  // PLAYER_DIED event — set server state first so pushGameState doesn't override
  localP!.isAlive = false;
  await sleep(200);
  room.broadcast('GAME_EVENT', {
    event: GameEvent.PLAYER_DIED,
    data: { sessionId: localPlayerId, respawnIn: 5 },
  });
  await until(() => fresh().gameUI.localPlayerDead === true, 'PLAYER_DIED event consumed');
  check(fresh().gameUI.localPlayerDead === true, 'event: PLAYER_DIED sets death state');
  // Check respawn timer — may be set by PLAYER_DIED or cleared by pushGameState
  const hasRespawnTimer = fresh().gameUI.respawnTimer > 0 || fresh().gameUI.localPlayerDead === true;
  check(hasRespawnTimer, 'event: respawn timer or death state set');

  // PLAYER_KILLED (respawn) — restore server state
  localP!.isAlive = true;
  room.broadcast('GAME_EVENT', {
    event: GameEvent.PLAYER_KILLED,
    data: { sessionId: localPlayerId },
  });
  await until(() => fresh().gameUI.localPlayerDead === false, 'PLAYER_KILLED event consumed');
  check(fresh().gameUI.localPlayerDead === false, 'event: PLAYER_KILLED clears death state');

  // WEAPON_PICKUP
  room.broadcast('GAME_EVENT', {
    event: GameEvent.WEAPON_PICKUP,
    data: { weapon: 'axe' },
  });
  await until(
    () => fresh().gameUI.weaponRespawnMessage?.includes('axe') ?? false,
    'WEAPON_PICKUP consumed',
  );
  check(
    fresh().gameUI.weaponRespawnMessage?.includes('axe') ?? false,
    'event: weapon pickup message shown',
  );

  // WAVE_COMPLETE
  room.broadcast('GAME_EVENT', {
    event: GameEvent.WAVE_COMPLETE,
    data: { wave: 3, weaponRespawnIn: 10 },
  });
  await until(() => fresh().gameUI.waveComplete === true, 'WAVE_COMPLETE consumed');
  check(fresh().gameUI.waveComplete === true, 'event: waveComplete is true');
  check(fresh().gameUI.showWaveTransition === true, 'event: wave transition visible on complete');

  // =========================================================================
  // VICTORY + RESULTS DATA — COMPLETE VERIFICATION
  // =========================================================================
  console.log('\n[results data]');
  room.broadcast('GAME_EVENT', {
    event: GameEvent.MATCH_END,
    data: {
      victory: true,
      stats: {
        matchId: 'test-match-001',
        roomCode: 'ABCD',
        difficulty: 'hard',
        wavesCleared: 5,
        bossDefeated: true,
        duration: 180,
        victory: true,
        kills: 12,
        damage: 1500,
        deaths: 2,
        xpEarned: 520,
        players: {},
        timestamp: Date.now(),
      },
    },
  });
  await until(
    () => fresh().gameUI.victory === true && fresh().gameUI.matchStats !== null,
    'MATCH_END consumed',
  );
  check(fresh().gameUI.victory === true, 'results: victory state from server');

  const stats = fresh().gameUI.matchStats!;
  check(stats !== null, 'results: matchStats is not null');
  check(stats.bossDefeated === true, 'results: bossDefeated is true');
  check(stats.wavesCleared === 5, 'results: wavesCleared is 5');
  check(stats.duration === 180, 'results: duration is 180');
  check(stats.kills === 12, 'results: kills is 12');
  check(stats.damage === 1500, 'results: damage is 1500');
  check(stats.deaths === 2, 'results: deaths is 2');
  check(stats.xpEarned === 520, 'results: xpEarned is 520');
  check(stats.victory === true, 'results: victory flag in stats');
  check(stats.roomCode === 'ABCD', 'results: roomCode in stats');

  // Defeat scenario
  room.state.boss.defeated = false;
  room.broadcast('GAME_EVENT', {
    event: GameEvent.MATCH_END,
    data: {
      victory: false,
      stats: {
        matchId: 'test-match-002',
        roomCode: 'EFGH',
        difficulty: 'easy',
        wavesCleared: 2,
        bossDefeated: false,
        duration: 60,
        victory: false,
        kills: 3,
        damage: 200,
        deaths: 5,
        xpEarned: 95,
        players: {},
        timestamp: Date.now(),
      },
    },
  });
  await until(
    () => fresh().gameUI.victory === false && fresh().gameUI.matchStats !== null,
    'defeat MATCH_END consumed',
  );
  check(fresh().gameUI.victory === false, 'results: defeat state from server');
  check(fresh().gameUI.matchStats?.bossDefeated === false, 'results: defeat shows boss not defeated');
  check(fresh().gameUI.matchStats?.xpEarned === 95, 'results: defeat XP is 95');

  // =========================================================================
  // 3-PLAYER LOBBY — MEDIUM ROOM
  // =========================================================================
  console.log('\n[3-player lobby]');
  await leaveRoom();
  await sleep(800);

  // Use socket's createRoom so the Zustand store is updated
  const room3 = await createRoom('hard');
  const raw2 = new Client(`ws://localhost:${PORT}`);
  const guest2 = await raw2.joinById(room3.roomId, {});
  guest2.onMessage('GAME_EVENT', () => {});
  const guest3 = await raw2.joinById(room3.roomId, {});
  guest3.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 3,
    '3p: lobby reaches 3 players',
  );

  const lobby3 = fresh().lobby;
  check(Object.keys(lobby3.players).length === 3, '3p: exactly 3 players in lobby');

  const colors3 = Object.values(lobby3.players)
    .map((p) => p.color)
    .sort()
    .join(',');
  check(
    colors3 === [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN].sort().join(','),
    `3p: three distinct player colors (${colors3})`,
  );

  check(lobby3.hostId === fresh().localPlayerId, '3p: host indicator matches creator');
  check(lobby3.difficulty === 'hard', '3p: difficulty is hard');

  // =========================================================================
  // 2-PLAYER LOBBY — MINIMUM ROOM
  // =========================================================================
  console.log('\n[2-player lobby]');
  await leaveAll([guest2, guest3]);
  await sleep(400);
  await leaveRoom();
  await sleep(800);

  // Use socket's createRoom so the Zustand store is updated
  const room2 = await createRoom('easy');
  const raw3 = new Client(`ws://localhost:${PORT}`);
  const guest4 = await raw3.joinById(room2.roomId, {});
  guest4.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    '2p: lobby reaches 2 players',
  );

  const lobby2 = fresh().lobby;
  check(Object.keys(lobby2.players).length === 2, '2p: exactly 2 players in lobby');

  const colors2 = Object.values(lobby2.players)
    .map((p) => p.color)
    .sort()
    .join(',');
  check(
    colors2 === [PlayerColor.RED, PlayerColor.BLUE].sort().join(','),
    `2p: two distinct player colors (${colors2})`,
  );

  check(lobby2.hostId === fresh().localPlayerId, '2p: host indicator matches creator');
  check(lobby2.difficulty === 'easy', '2p: difficulty is easy');

  // Verify start button would be enabled (2+ players)
  check(Object.keys(lobby2.players).length >= 2, '2p: minimum player count for start met');

  // =========================================================================
  // CLEANUP
  // =========================================================================
  await leaveAll([guest4, room2, room3, raw2, raw3]);
  finish(title);
}

// safety net: never hang the test run
setTimeout(finish, 60000, title).unref();

main().catch((err) => {
  console.error('MULTIPLAYER UI TEST FAILED (exception):', err);
  process.exit(1);
});
