# web.publisher.com

React + Vite publishing dashboard (PWA).

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Production build: `npm run build` → `dist/`

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | `api.publisher.com` base URL (e.g. `http://localhost:3001/api`) |
| `VITE_LINKEDIN_*` | Pre-fill LinkedIn fields in API Config |
| `VITE_META_*` | Pre-fill Meta fields |

Without `VITE_API_BASE_URL`, publish/schedule runs in **demo mode** (no calls to social networks).
