import mongoose from 'mongoose'
import { logger } from './lib/logger.js'

let connected = false
let lastError = null
let listenersAttached = false

const isServerless = Boolean(process.env.VERCEL) || process.env.AWS_LAMBDA_FUNCTION_NAME

/** Tuned for Vercel cold starts: small pool, reuse across warm invocations, fail before UI hangs. */
const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: isServerless ? 8_000 : 20_000,
  connectTimeoutMS: isServerless ? 8_000 : 20_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: isServerless ? 5 : 10,
  minPoolSize: 0,
  maxIdleTimeMS: isServerless ? 30_000 : 0,
  /** Prefer IPv4 — fixes some `queryTxt ETIMEOUT` issues on macOS / certain networks */
  family: 4,
}

export function getLastDbError() {
  return lastError
}

export function markDisconnected(err) {
  connected = false
  if (err) lastError = err
}

function attachConnectionListeners() {
  if (listenersAttached) return
  listenersAttached = true
  const conn = mongoose.connection
  conn.on('disconnected', () => {
    markDisconnected()
    logger.warn('MongoDB disconnected')
  })
  conn.on('error', (err) => {
    markDisconnected(err)
    logger.warn('MongoDB connection error', { error: err.message })
  })
}

export function isMongoNetworkError(err) {
  const msg = err?.message || ''
  const code = err?.cause?.code || err?.code
  return (
    code === 'ENOTFOUND' ||
    code === 'ETIMEOUT' ||
    code === 'ECONNREFUSED' ||
    /MongoServerSelectionError|MongoNetworkError|queryTxt ETIMEOUT|getaddrinfo/i.test(msg)
  )
}

export async function connectDb(retries = isServerless ? 2 : 3) {
  const uri = process.env.DATABASE?.trim()
  if (!uri) {
    const err = new Error('DATABASE is not set in api.publisher.com/.env')
    lastError = err
    throw err
  }

  // readyState 1 = connected; 2 = connecting (reuse in-flight on warm serverless)
  if (mongoose.connection.readyState === 1) {
    connected = true
    return mongoose.connection
  }
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise()
    connected = true
    return mongoose.connection
  }

  mongoose.set('strictQuery', true)
  mongoose.set('bufferCommands', true)

  let attempt = 0
  while (attempt < retries) {
    attempt += 1
    try {
      await mongoose.connect(uri, CONNECT_OPTIONS)
      attachConnectionListeners()
      connected = true
      lastError = null
      logger.success('MongoDB connected', { database: mongoose.connection.name })
      return mongoose.connection
    } catch (err) {
      lastError = err
      const isLast = attempt >= retries
      logger.warn(`MongoDB connect attempt ${attempt}/${retries} failed`, {
        error: err.message,
      })
      if (isLast) throw err
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
}

export function isDbReady() {
  return connected && mongoose.connection.readyState === 1
}
