# Storm Arena — Environment Variables

## Server (REST + WebSocket, shared port)

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | HTTP + WebSocket port (Express REST and Colyseus share it) | No | `2567` |
| `NODE_ENV` | `development` or `production` | No | `development` |
| `JWT_SECRET` | JWT signing secret. **Required in production** and must be long/random | Yes (prod) | `dev-secret-change-me` |
| `JWT_EXPIRES_IN` | Token lifetime (see `jsonwebtoken` ms format) | No | `7d` |
| `CORS_ORIGIN` | Comma-separated allowed browser origins, or `*` | No | `*` |

> Client-side: the Vite dev server proxies `/api` to `http://localhost:2567`. Other
> REST calls that require a token send `Authorization: Bearer <token>`.

## Database

| Variable | Description | Required | Default |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | Yes (prod) | — |

Example:
```
DATABASE_URL="postgresql://stormarena:stormarena@localhost:5433/stormarena?schema=public"
```

Apply migrations: `npm run db:deploy`  •  Seed achievements/demo data: `npm run db:seed`  •  Local dev (`migrate dev`): needs a reachable Postgres.

## Local Postgres quick start

With Docker:

```bash
docker compose up -d db
cp .env.example .env
npm install
npm run build
npm run db:deploy   # or db:migrate in development
npm run db:seed
```

Without Docker, any external PostgreSQL works — point `DATABASE_URL` at it.

## Shared / Client

No environment variables required for the shared package. The client uses the Vite
dev proxy (`/api` → `localhost:2567`) in development.