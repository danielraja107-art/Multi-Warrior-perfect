# Storm Arena — Shared Contract & Build Documentation

## Contract Version: 0.1.0 (Foundation)

This document is the source of truth for shared contracts between Server (Member 1), Client (Member 2), and UI/Platform (Member 3).

## Monorepo Layout

```text
shared/   → @storm-arena/shared   (shared contracts, schemas, constants)
server/   → @storm-arena/server   (Colyseus authoritative server + Express REST + auth)
client/   → @storm-arena/client   (3D client — Member 2)
database/ → @storm-arena/database (Prisma schema, client, migrations, seed)
docs/     → documentation
```

## Getting Started

```bash
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
npm install                   # install all workspaces
npm run build:shared          # build shared contracts
npm run db:migrate            # apply Prisma migrations (needs Postgres running)
npm run db:seed               # seed achievements + demo data
npm run dev:server            # REST + WebSocket server at :2567
npm run dev:client            # Vite dev server at :3000 (proxies /api → :2567)
npm run test:api              # full REST pipeline integration tests
```

## Server

- Express REST + Colyseus WebSocket share one HTTP server on port `2567` (override with `PORT` env).
- Room name: `game_room` (authoritative simulation at 20 Hz / 50 ms).
- Health check: `GET /health`.

### REST API (prefix `/api`)

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | — | Create account (email/username/password) → `{ user, token }` |
| `POST /api/auth/login` | — | Log in by email or username → `{ user, token }` |
| `GET /api/me` | Bearer | Profile + achievements |
| `GET /api/me/stats` | Bearer | Aggregated stats |
| `PATCH /api/me/avatar` | Bearer | Set avatar URL |
| `GET /api/me/history` | Bearer | Match history |
| `GET /api/achievements` | Bearer | All achievements + unlock state |
| `GET /api/matches/:id` | Bearer | Match detail + leaderboard |
| `POST /api/matches` | Bearer | Authoritative save. **Disabled in production** |

Passwords are hashed with bcrypt. Tokens are JWT (`7d`). Auth routes are rate-limited.
Match results are never accepted from browsers in production (server-authoritative).

## Shared Contracts (do not change casually)

| Contract | Path | Status |
|---|---|---|
| Game state schema | `shared/src/schemas/GameState.ts` | v0.1.0 |
| Message types | `shared/src/messages/index.ts` | v0.1.0 |
| Type enums | `shared/src/types/index.ts` | v0.1.0 |
| Weapon constants | `shared/src/constants/weapons.ts` | v0.1.0 |
| Enemy constants | `shared/src/constants/enemies.ts` | v0.1.0 |
| Wave constants | `shared/src/constants/waves.ts` | v0.1.0 |

## Client → Server Messages

| Type | Purpose |
|---|---|
| `PLAYER_MOVE` | Direction + rotation for authoritative movement |
| `PLAYER_ATTACK` | Light/heavy attack intent |
| `PLAYER_DODGE` | Dodge intent |
| `PLAYER_BLOCK` | Block toggle |
| `PLAYER_PICKUP` | Weapon pickup intent |
| `PLAYER_THROW` | Rock throw intent |
| `HOST_START` | Host starts the game |
| `HOST_CHANGE_DIFFICULTY` | Host changes difficulty (lobby only) |

## Server → Client (via state sync + events)

- Room state is authoritative and synced via Colyseus schema (`GameState`).
- Server events: `WAVE_START`, `WAVE_COMPLETE`, `BOSS_SPAWN`, `BOSS_PHASE_CHANGE`, `BOSS_DEFEATED`, `PLAYER_DIED`, `PLAYER_KILLED`, `WEAPON_PICKUP`, `WEAPON_DROP`, `MATCH_END`.

## Player Colors (fixed order)

Red → Blue → Green → Yellow (player 1–4).
