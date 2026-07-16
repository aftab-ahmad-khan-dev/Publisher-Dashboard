/**
 * Google Sheets import helpers.
 * Shared "anyone with link" workbooks are fetched as xlsx export when possible.
 * Live cell write-back uses Sheets API when a Gmail OAuth access token is available.
 */
import { extractSpreadsheetId, parseWorkbookBuffer } from './leadWorkbook.js'
import { logger } from './logger.js'

export function sheetsExportXlsxUrl(spreadsheetId) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`
}

export async function fetchSpreadsheetXlsx(spreadsheetId) {
  const url = sheetsExportXlsxUrl(spreadsheetId)
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'PulsePublisher/1.0',
    },
  })
  if (!res.ok) {
    throw new Error(
      `Could not download Google Sheet (${res.status}). Make sure sharing is “Anyone with the link can view”, or upload the .xlsx file instead.`,
    )
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new Error(
      'Google returned a login page instead of the spreadsheet. Share the sheet as “Anyone with the link”, or upload an .xlsx export.',
    )
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('Downloaded spreadsheet was empty.')
  return buf
}

export async function importGoogleSheet(urlOrId, options = {}) {
  const spreadsheetId = extractSpreadsheetId(urlOrId)
  if (!spreadsheetId) throw new Error('Invalid Google Sheets URL or ID.')
  const buffer = await fetchSpreadsheetXlsx(spreadsheetId)
  const parsed = await parseWorkbookBuffer(buffer, options)
  return { spreadsheetId, buffer, parsed }
}

/**
 * Batch update cells via Sheets API.
 * updates: [{ range: 'Sweden!J3', values: [['sent']] }, ...]
 */
export async function sheetsBatchUpdate(accessToken, spreadsheetId, dataUpdates) {
  if (!accessToken || !spreadsheetId || !dataUpdates?.length) return { ok: false }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataUpdates.map((u) => ({
          range: u.range,
          values: u.values,
        })),
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    logger.warn('Sheets batchUpdate failed', {
      status: res.status,
      error: err.error?.message || res.statusText,
    })
    return { ok: false, error: err.error?.message || `Sheets API ${res.status}` }
  }
  return { ok: true }
}

/** Convert 1-based column index to A1 letter(s). */
export function colToA1(col) {
  let n = col
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}
