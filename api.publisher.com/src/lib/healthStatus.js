import mongoose from 'mongoose'
import { isDbReady, getLastDbError } from '../db.js'
import { ensureDbConnected } from './dbInit.js'

const startedAt = Date.now()

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return `${day}d ${hr % 24}h`
  if (hr > 0) return `${hr}h ${min % 60}m`
  if (min > 0) return `${min}m`
  return `${sec}s`
}

function memoryLoadLabel() {
  const heap = process.memoryUsage().heapUsed / 1024 / 1024
  if (heap < 80) return { label: 'Low', tone: 'good' }
  if (heap < 200) return { label: 'Moderate', tone: 'good' }
  return { label: 'Elevated', tone: 'warn' }
}

export async function collectHealthStatus() {
  const t0 = Date.now()
  let dbConnected = false
  let dbName = ''
  let dbError = ''

  try {
    await ensureDbConnected()
    dbConnected = isDbReady()
    dbName = mongoose.connection.name || 'MongoDB'
  } catch (err) {
    dbError = err.message
  }
  if (!dbConnected && !dbError) {
    const last = getLastDbError()
    if (last?.message) dbError = last.message
  }

  const responseMs = Date.now() - t0
  const uptimeMs = Date.now() - startedAt
  const load = memoryLoadLabel()
  const env = process.env.NODE_ENV || 'development'
  const runtime = isVercel() ? 'Vercel Serverless' : `Node.js ${process.version.replace('v', '')}`
  const region = process.env.VERCEL_REGION || process.env.AWS_REGION || 'Global'
  const healthy = dbConnected

  return {
    ok: healthy,
    service: 'api.publisher.com',
    title: 'Pulse Publisher API',
    tagline: healthy
      ? 'Backend infrastructure is healthy and performing optimally. All services are running smoothly.'
      : 'Backend is running but MongoDB is unreachable. Check DATABASE in .env, Atlas IP allowlist, and network/DNS (queryTxt ETIMEOUT often means DNS or firewall).',
    db: {
      connected: dbConnected,
      name: dbName,
      label: dbConnected ? 'Connected' : dbError ? 'Error' : 'Connecting…',
      error: dbError,
    },
    uptime: formatUptime(uptimeMs),
    responseMs,
    load,
    environment: env.charAt(0).toUpperCase() + env.slice(1),
    runtime,
    framework: 'Express',
    region,
    scheduler: !isVercel() ? 'Active (15s)' : 'Vercel Cron (1m)',
    checkedAt: new Date().toLocaleTimeString('en-US', { hour12: true }),
    webUrl: process.env.WEB_URL?.trim() || 'http://localhost:5173',
  }
}

function isVercel() {
  return Boolean(process.env.VERCEL)
}
