import { connectDb, isDbReady } from '../db.js'

let dbInit = null

export function resetDbConnection() {
  dbInit = null
}

export function ensureDbConnected() {
  if (isDbReady()) {
    return Promise.resolve()
  }
  // Drop stale resolved promise after disconnect so the next request reconnects
  if (dbInit) dbInit = null
  dbInit = connectDb().catch((err) => {
    dbInit = null
    throw err
  })
  return dbInit
}
