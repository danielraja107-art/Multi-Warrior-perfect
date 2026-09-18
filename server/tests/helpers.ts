import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { gameRoomRouter } from '../src/api/GameRoomRouter';
import { useGameStore } from '../../client/src/state/useGameStore';

export let failures: string[] = [];

export function resetFailures() {
  failures = [];
}

export function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fresh = () => useGameStore.getState();

export async function until(cond: () => boolean, what: string, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return true;
    await sleep(50);
  }
  check(false, `${what} (timeout after ${timeoutMs}ms)`);
  return false;
}

export async function startGameServer(port: number, roomClass: any) {
  const app = express();
  app.use(cors());
  app.use('/api', gameRoomRouter);
  const httpServer = http.createServer(app);

  const gameServer = new Server({ server: httpServer });
  gameServer.define('game_room', roomClass);
  await gameServer.listen(port);
  return { gameServer, httpServer, app };
}

export async function leaveAll(rooms: any[]) {
  for (const r of rooms) {
    if (r && typeof r.leave === 'function') {
      try {
        await Promise.race([
          r.leave().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 200)),
        ]);
      } catch {
        // ignore
      }
    }
  }
}

export function finish(title: string) {
  console.log(
    failures.length === 0 ? `\nALL ${title} PASSED` : `\n${failures.length} ${title} TESTS FAILED`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}