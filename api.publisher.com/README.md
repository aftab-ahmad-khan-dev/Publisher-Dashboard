# api.publisher.com

Backend for Pulse Publisher — publish, schedule, and connection tests.

## Local

```bash
cd api.publisher.com
cp .env.example .env
npm install
npm run dev
```

Health: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/publish` | Publish to selected platforms |
| POST | `/api/schedule` | Schedule a post |
| POST | `/api/connections/meta/test` | Validate Meta credentials |
| POST | `/api/connections/linkedin/test` | Validate LinkedIn credentials |

Set platform secrets in `.env` (never expose client secrets to the browser).
