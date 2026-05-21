import { connectDb } from '../db.js'

let dbInit = null

export function ensureDbConnected() {
  if (!dbInit) {
    dbInit = connectDb().catch((err) => {
      dbInit = null
      throw err
    })
  }
  return dbInit
}
