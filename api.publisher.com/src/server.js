import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { ensureDbConnected } from './lib/dbInit.js'
import { workspaceMiddleware } from './middleware/workspace.js'
import routes from './routes.js'
import healthRoutes from './routes/health.js'
import { startScheduler } from './lib/scheduler.js'
import { collectHealthStatus } from './lib/healthStatus.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const isVercel = Boolean(process.env.VERCEL)

app.use(cors({ origin: true }))
app.use(express.json({ limit: '10mb' }))

app.use(healthRoutes)

app.get('/api/health', async (req, res) => {
  const status = await collectHealthStatus()
  res.status(status.ok ? 200 : 503).json({
    ok: status.ok,
    service: status.service,
    db: status.db.connected ? 'connected' : 'disconnected',
    database: status.db.name,
    uptime: status.uptime,
    responseMs: status.responseMs,
    environment: status.environment,
    runtime: status.runtime,
    scheduler: status.scheduler,
    error: status.db.error || undefined,
  })
})

app.use('/api', async (req, res, next) => {
  try {
    await ensureDbConnected()
    next()
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Database unavailable' })
  }
})

app.use('/api', workspaceMiddleware, routes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ ok: false, error: err.message || 'Server error' })
})

if (!isVercel) {
  ensureDbConnected()
    .then(() => {
      startScheduler()
      app.listen(port, () => {
        console.log(`api.publisher.com listening on http://localhost:${port}`)
        console.log(`Health dashboard: http://localhost:${port}/`)
      })
    })
    .catch((err) => {
      console.error('Failed to start API:', err)
      process.exit(1)
    })
}

export default app
