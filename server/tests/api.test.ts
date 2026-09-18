import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const BASE_URL = process.env.TEST_API_URL ?? 'http://localhost:2567';
const PORT = 2567;

function request<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: T }> {
  return new Promise((resolve, reject) => {
    const data = options.body === undefined ? undefined : JSON.stringify(options.body);
    const req = http.request(
      BASE_URL + path,
      {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let body: T = undefined as T;
          if (raw.length > 0) {
            try {
              body = JSON.parse(raw) as T;
            } catch {
              /* keep undefined */
            }
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

interface AuthResponse {
  user: { id: string; username: string; email: string };
  token: string;
}

function assert(cond: boolean, message: string): void {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      http
        .get(`${url}/health`, (res) => {
          if (res.statusCode === 200) resolve();
          else retry();
        })
        .on('error', retry);
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs)
        reject(new Error('Server did not become healthy in time.'));
      else setTimeout(check, 500);
    };
    check();
  });
}

let serverProc: ChildProcess | null = null;

async function main() {
  console.log(`[api-test] target ${BASE_URL}`);

  let health: { status: number; body?: { status: string } };
  try {
    health = await request<{ status: string }>('/health');
  } catch {
    health = { status: 0 };
  }

  if (health.status !== 200) {
    if (process.env.START_SERVER !== '1') {
      console.log('[api-test] Server not running. Skipping integration test or run with START_SERVER=1.');
      process.exit(0);
    }
    serverProc = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: __dirname + '/..',
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'inherit',
    });
    await waitForServer(BASE_URL);
  }

  const now = Date.now();
  const uniq = `t${now.toString(36).slice(-6)}`;
  const email = `api-${uniq}@test.arena`;
  const username = `tester_${uniq}`;
  const password = 'secret123';

  let token: string;
  let userId: string;

  // 1. Health (done above). 2. Register
  const reg = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { email, username, password },
  });
  assert(reg.status === 201, `register should be 201, got ${reg.status}`);
  token = reg.body.token;
  userId = reg.body.user.id;
  assert(typeof token === 'string' && token.length > 20, 'register should return a JWT token');
  console.log('[api-test] PASS register + JWT');

  // 3. Duplicate register
  const dup = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { email, username, password },
  });
  assert(dup.status === 409, `duplicate register should be 409, got ${dup.status}`);
  console.log('[api-test] PASS duplicate rejection');

  // 4. Login with email
  const login = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { identifier: email, password },
  });
  assert(login.status === 200 && login.body.token, 'login should succeed');
  token = login.body.token;
  console.log('[api-test] PASS login');

  // 5. Login with wrong password
  const badLogin = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { identifier: email, password: 'wrong-pass' },
  });
  assert(badLogin.status === 401, `bad login should be 401, got ${badLogin.status}`);
  console.log('[api-test] PASS bad login rejected');

  // 6. Unauthenticated /me
  const noAuth = await request('/api/me');
  assert(noAuth.status === 401, `unauthenticated /me should be 401, got ${noAuth.status}`);
  console.log('[api-test] PASS auth middleware');

  // 7. /me
  const me = await request<{ id: string; username: string; profile: { level: number } }>(
    '/api/me',
    { token },
  );
  assert(me.status === 200 && me.body.id === userId, 'me should return the registered user');
  assert(me.body.profile.level === 1, 'profile should start at level 1');
  console.log('[api-test] PASS /me profile');

  // 8. Stats
  const stats = await request<{ matchesPlayed: number; totalKills: number }>('/api/me/stats', {
    token,
  });
  assert(
    stats.status === 200 && stats.body.matchesPlayed === 0,
    'stats should show 0 matches played',
  );
  console.log('[api-test] PASS /me/stats');

  // 9. Register a second player
  const reg2 = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { email: `p2-${uniq}@test.arena`, username: `p2_${uniq}`, password },
  });
  assert(reg2.status === 201, 'second player register');
  console.log('[api-test] PASS second player');

  // 10. Persist a win (dev-mode endpoint) — XP + stats + achievements
  const sessionId = `session-${uniq}`;
  const partySize = 2;
  const waves = 5;
  const matchRes = await request<{ matchId: string; duplicate: boolean }>('/api/matches', {
    method: 'POST',
    token,
    body: {
      sessionId,
      roomCode: 'AAAA' + uniq.slice(-4).toUpperCase(),
      arena: 'storm_arena',
      difficulty: 'normal',
      wavesCleared: waves,
      bossDefeated: true,
      duration: 540,
      victory: true,
      participants: [
        { userId, color: 'orange', kills: 42, damage: 12000, deaths: 1 },
        { userId: reg2.body.user.id, color: 'cyan', kills: 10, damage: 3000, deaths: 3 },
      ],
    },
  });
  assert(
    matchRes.status === 201,
    `match save should be 201, got ${matchRes.status}: ${JSON.stringify(matchRes.body)}`,
  );
  console.log('[api-test] PASS match persistence');

  // 11. Idempotency (same sessionId)
  const dupMatch = await request<{ duplicate: boolean }>('/api/matches', {
    method: 'POST',
    token,
    body: {
      sessionId,
      roomCode: 'AAAA',
      arena: 'storm_arena',
      difficulty: 'normal',
      wavesCleared: waves,
      bossDefeated: true,
      duration: 540,
      victory: true,
      participants: [{ userId, color: 'orange', kills: 42, damage: 12000, deaths: 1 }],
    },
  });
  assert(
    dupMatch.status === 200 && dupMatch.body.duplicate === true,
    'duplicate save should be detected',
  );
  console.log('[api-test] PASS duplicate-match prevention');

  // 12. XP formula check: kills*10 + damage/10 + waves*50 + boss 200
  const xpExpected = 42 * 10 + Math.floor(12000 / 10) * 1 + waves * 50 + 200;
  const xpExpected2 = 10 * 10 + Math.floor(3000 / 10) + waves * 50 + 200;

  const me2 = await request<{
    profile: { level: number; xp: number; totalKills: number; wins: number };
  }>('/api/me', { token });
  const myXp = me2.body.profile.xp;
  const myLevel = me2.body.profile.level;
  assert(me2.body.profile.totalKills === 42, 'totalKills should increment to 42');
  assert(me2.body.profile.wins === 1, 'wins should be 1');
  const xpToNextLevel = (lvl: number) => 100 * lvl;
  let calcLvl = 1;
  let calcXp = xpExpected;
  while (calcXp >= xpToNextLevel(calcLvl)) {
    calcXp -= xpToNextLevel(calcLvl);
    calcLvl += 1;
  }
  assert(myLevel === calcLvl, `level mismatch: got ${myLevel}, expected ${calcLvl}`);
  assert(myXp === calcXp, `xp mismatch: got ${myXp}, expected ${calcXp}`);
  console.log('[api-test] PASS XP + level progression');

  const p2 = await request<{ profile: { totalDamage: number } }>('/api/me', {
    token: reg2.body.token,
  });
  assert(p2.body.profile.totalDamage === 3000, 'second player damage persisted');
  console.log('[api-test] PASS participant stats');

  // 13. Achievements unlocked for winner (first_win, boss_slayer, wave_5; NOT 100_kills yet at 42 kills)
  const ach = await request<{ achievements: { code: string; unlocked: boolean }[] }>(
    '/api/achievements',
    { token },
  );
  const achMap = new Map(ach.body.achievements.map((a) => [a.code, a.unlocked]));
  assert(achMap.get('first_win') === true, 'first_win should be unlocked');
  assert(achMap.get('boss_slayer') === true, 'boss_slayer should be unlocked');
  assert(achMap.get('wave_5') === true, 'wave_5 should be unlocked');
  assert(achMap.get('100_kills') === false, '100_kills must stay locked until 100 total kills');
  console.log('[api-test] PASS achievements unlocked');

  // 13b. Push 100_kills by persisting another match with enough kills
  const sessionId2 = `session2-${uniq}`;
  const match2 = await request<{ matchId: string }>('/api/matches', {
    method: 'POST',
    token,
    body: {
      sessionId: sessionId2,
      roomCode: 'BBBB',
      arena: 'storm_arena',
      difficulty: 'hard',
      wavesCleared: 3,
      bossDefeated: false,
      duration: 300,
      victory: false,
      participants: [{ userId, color: 'orange', kills: 65, damage: 5000, deaths: 2 }],
    },
  });
  assert(match2.status === 201, 'second match save');
  const ach2 = await request<{ achievements: { code: string; unlocked: boolean }[] }>(
    '/api/achievements',
    { token },
  );
  const achMap2 = new Map(ach2.body.achievements.map((a) => [a.code, a.unlocked]));
  assert(achMap2.get('100_kills') === true, '100_kills should unlock after crossing 100 kills');
  console.log('[api-test] PASS 100_kills achievement');

  // 14. Match history (2 matches now)
  const history = await request<{
    matches: { id: string; victory: boolean; participants: unknown[] }[];
  }>('/api/me/history', { token });
  assert(
    history.status === 200 && history.body.matches.length === 2,
    'history should contain both saved matches',
  );
  assert(history.body.matches[0].victory === false, 'most recent match is the loss');
  assert(history.body.matches[1].victory === true, 'earlier match is the win');
  console.log('[api-test] PASS match history');

  // 15. Match detail (the win has 2 participants; history[1])
  const detailWin = await request<{ match: { participants: unknown[] } }>(
    `/api/matches/${history.body.matches[1].id}`,
    { token },
  );
  assert(
    detailWin.status === 200 && detailWin.body.match.participants.length === 2,
    'win match detail should show 2 participants',
  );
  const detailId = await request<{ match: { participants: unknown[] } }>(
    `/api/matches/${history.body.matches[0].id}`,
    { token },
  );
  assert(
    detailId.status === 200 && detailId.body.match.participants.length === 1,
    'loss match detail should show 1 participant',
  );
  console.log('[api-test] PASS match detail');

  // 16. Profile achievements array on /me
  assert(me2.body.profile !== undefined, 'profile loaded');

  console.log('\n[api-test] ALL CHECKS PASSED');
  process.exit(0);
}

main().catch((err) => {
  console.error('[api-test] FAILED:', err.message);
  process.exit(1);
});

process.on('exit', () => {
  serverProc?.kill('SIGTERM');
});
