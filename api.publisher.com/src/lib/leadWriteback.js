/**
 * Debounced lead-source status write-back (xlsx buffer + optional Sheets API).
 */
import { LeadSource } from '../models/LeadSource.js'
import { patchWorkbookStatus, TRACKING_COLUMNS } from './leadWorkbook.js'
import { sheetsBatchUpdate, colToA1 } from './googleSheets.js'
import { getGmailAccessToken } from './gmailOAuth.js'
import { logger } from './logger.js'

const queues = new Map() // sourceId -> { timer, updates: Map }

function queueKey(sourceId, email, sheetName) {
  return `${sheetName}::${String(email).toLowerCase()}`
}

export function enqueueLeadStatusUpdate(sourceId, update) {
  if (!sourceId || !update?.email) return
  const id = String(sourceId)
  let entry = queues.get(id)
  if (!entry) {
    entry = { updates: new Map(), timer: null }
    queues.set(id, entry)
  }
  const key = queueKey(id, update.email, update.sheetName || '')
  const prev = entry.updates.get(key) || {}
  entry.updates.set(key, { ...prev, ...update })

  if (entry.timer) clearTimeout(entry.timer)
  entry.timer = setTimeout(() => {
    flushLeadStatusUpdates(id).catch((err) =>
      logger.warn('Lead status flush failed', { error: err.message }),
    )
  }, 30_000)
}

export async function flushLeadStatusUpdates(sourceId) {
  const entry = queues.get(String(sourceId))
  if (!entry || entry.updates.size === 0) return
  if (entry.timer) clearTimeout(entry.timer)
  const updates = [...entry.updates.values()]
  entry.updates.clear()
  queues.delete(String(sourceId))

  const source = await LeadSource.findById(sourceId)
  if (!source) return

  if (source.fileData?.length) {
    try {
      const next = await patchWorkbookStatus(source.fileData, updates)
      source.fileData = next
      source.lastSyncAt = new Date()
      await source.save()
    } catch (err) {
      logger.warn('xlsx write-back failed', { error: err.message })
    }
  }

  if (source.type === 'sheets' && source.spreadsheetId) {
    try {
      const { accessToken } = await getGmailAccessToken(source.workspaceId)
      // Best-effort: write Email Status into a column by sheet name + row if known
      const data = []
      for (const u of updates) {
        if (!u.sheetName || !u.rowNumber) continue
        // Assume tracking columns start after existing data; write Status at a
        // conservative far column J if we don't know — prefer stored meta.
        const meta = source.sheetsMeta?.find((s) => s.sheetName === u.sheetName)
        const statusCol = meta?.trackingCol || 10
        const range = `'${u.sheetName}'!${colToA1(statusCol)}${u.rowNumber}`
        data.push({
          range,
          values: [[u.status || '']],
        })
        if (u.opens != null) {
          data.push({
            range: `'${u.sheetName}'!${colToA1(statusCol + 2)}${u.rowNumber}`,
            values: [[u.opens]],
          })
        }
      }
      if (data.length) {
        await sheetsBatchUpdate(accessToken, source.spreadsheetId, data)
        source.lastSyncAt = new Date()
        await source.save()
      }
    } catch (err) {
      logger.warn('Sheets API write-back skipped', { error: err.message })
    }
  }
}

export { TRACKING_COLUMNS }
