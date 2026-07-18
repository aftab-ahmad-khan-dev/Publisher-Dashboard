# Pulse Publisher

Monorepo with two apps:

| Folder | Role |
|--------|------|
| [`web.publisher.com`](./web.publisher.com) | React + Vite dashboard (PWA) |
| [`api.publisher.com`](./api.publisher.com) | Express API for publish / schedule / connection tests |

## Quick start

```bash
npm run install:all

# Terminal 1 — API (port 3001)
npm run dev:api

# Terminal 2 — Web (port 5173)
npm run dev:web
```

Open [http://localhost:5173](http://localhost:5173). Set `VITE_API_BASE_URL=http://localhost:3001/api` in `web.publisher.com/.env.local` for live publish (not demo mode).

### Login (demo)

| Field    | Value |
|----------|-------|
| Username | `Joseph Morgan` or `Josehph Morgan` |
| Password | `Morgan` |

## Deploy (Vercel)

### Option A — Deploy from repo root (web only)

Import the repo in Vercel. Root `vercel.json` builds `web.publisher.com` (uses `build.mjs` like Vite + `node build.mjs`).

Set **Environment Variables** (Production):

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://your-api.vercel.app/api` |

### Option B — Two projects (recommended)

| Project | Root directory | Build |
|---------|----------------|-------|
| **Web** | `web.publisher.com` | `npm run build` → `dist` |
| **API** | `api.publisher.com` | Serverless Express (`api/index.js`) |

**API env:** `DATABASE`, `WEB_URL`, `LINKEDIN_REDIRECT_URI`, `CRON_SECRET`, `LINKEDIN_*`, `META_*`

**Web env:** `VITE_API_BASE_URL` = your API URL + `/api`

LinkedIn redirect URI must match production: `https://your-api.vercel.app/api/auth/linkedin/callback`

Scheduled posts on Vercel use **Cron** (`/api/cron/run-scheduler` every minute).

## Where data lives

- **MongoDB** (`DATABASE` in `api.publisher.com/.env`) — API config, drafts, scheduled & published posts per workspace.
- **Real-time** — Server-Sent Events at `GET /api/events`; scheduler runs every 15s for due posts.
- **Live publish** — Meta Graph (Facebook feed) + LinkedIn REST posts (needs OAuth **Access Token** in API Config).

**Security:** Never commit `.env`. Rotate MongoDB credentials if they were exposed in chat or git history.

See [`web.publisher.com/README.md`](./web.publisher.com/README.md) and [`api.publisher.com/README.md`](./api.publisher.com/README.md) for details.
Updated Calendar