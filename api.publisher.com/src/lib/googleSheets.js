/**
 * Google Sheets + remote Excel workbook import helpers.
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
  return { spreadsheetId, buffer, parsed, kind: 'sheets' }
}

/** True for Google Sheets URLs / IDs. */
export function isGoogleSheetsUrl(urlOrId) {
  return Boolean(extractSpreadsheetId(urlOrId))
}

/**
 * Direct Excel / CSV URL (Dropbox, OneDrive “download”, raw .xlsx, etc.).
 */
export function looksLikeWorkbookUrl(url) {
  const u = String(url || '').trim().toLowerCase()
  if (!u.startsWith('http')) return false
  if (isGoogleSheetsUrl(u)) return false
  return (
    /\.(xlsx|xls|csv|tsv)(\?|#|$)/i.test(u) ||
    /onedrive\.live\.com|1drv\.ms|sharepoint\.com|dropbox\.com|dl\.dropboxusercontent\.com/i.test(
      u,
    )
  )
}

function normalizeRemoteWorkbookUrl(url) {
  let u = String(url || '').trim()
  // Dropbox share → direct download
  if (/dropbox\.com/i.test(u)) {
    u = u.replace(/([?&])dl=0/, '$1dl=1')
    if (!/[?&]dl=/.test(u)) u += (u.includes('?') ? '&' : '?') + 'dl=1'
  }
  // OneDrive/SharePoint: prefer download=1 when present as view link
  if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com/i.test(u) && !/[?&]download=/i.test(u)) {
    u += (u.includes('?') ? '&' : '?') + 'download=1'
  }
  return u
}

export async function fetchRemoteWorkbook(url) {
  const target = normalizeRemoteWorkbookUrl(url)
  const res = await fetch(target, {
    redirect: 'follow',
    headers: { 'User-Agent': 'PulsePublisher/1.0' },
  })
  if (!res.ok) {
    throw new Error(
      `Could not download workbook (${res.status}). Use a public share link, or upload the .xlsx file instead.`,
    )
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new Error(
      'Link returned a web page, not a file. Use “Anyone with the link” / public download, a Google Sheets link, or upload the Excel file.',
    )
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('Downloaded workbook was empty.')
  return buf
}

/**
 * Import leads from either a Google Sheets link or a direct Excel/CSV URL.
 */
export async function importWorkbookFromLink(url, options = {}) {
  const raw = String(url || '').trim()
  if (!raw) throw new Error('Paste a Google Sheets or Excel file link.')

  if (isGoogleSheetsUrl(raw)) {
    return importGoogleSheet(raw, options)
  }

  if (!looksLikeWorkbookUrl(raw) && !/^https?:\/\//i.test(raw)) {
    throw new Error('Paste a full https link to Google Sheets or an Excel (.xlsx) file.')
  }

  const buffer = await fetchRemoteWorkbook(raw)
  let parsed
  try {
    parsed = await parseWorkbookBuffer(buffer, options)
  } catch (err) {
    logger.warn('Remote workbook parse failed', { message: err.message })
    throw new Error(
      'Could not parse that link as Excel/CSV. Upload the .xlsx file, or use a Google Sheets link shared as “Anyone with the link”.',
    )
  }
  return {
    spreadsheetId: null,
    buffer,
    parsed,
    kind: 'xlsx-url',
    sourceUrl: raw,
  }
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
