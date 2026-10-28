/**
 * Flexible multi-sheet Excel / tabular lead parser.
 * Columns are detected by header aliases (never by fixed letter).
 * Title rows above the header row are tolerated.
 */
import ExcelJS from 'exceljs'
import { buildNichePain, buildNichePainShort } from './nichePain.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
const NO_EMAIL_RE = /^(no\s*email|n\/?a|none|-|null|undefined)$/i

export const LEAD_HEADER_ALIASES = {
  email: ['email', 'email id', 'e-mail', 'e mail', 'mail', 'email address', 'emailid'],
  name: [
    'client name',
    'name',
    'full name',
    'contact',
    'contact name',
    'person',
    'lead name',
  ],
  designation: ['designation', 'title', 'job title', 'role', 'position'],
  company: [
    'company name',
    'company',
    'business',
    'organization',
    'organisation',
    'org',
    'firm',
  ],
  linkedin: ['linkedin id', 'linkedin', 'linkedin url', 'linkedin profile', 'li'],
  location: [
    'location/country',
    'location / country',
    'location',
    'country',
    'city',
    'region',
    'address',
  ],
  industry: ['industry', 'niche', 'sector', 'vertical', 'category', 'market'],
  update: ['update', 'status', 'notes', 'remark', 'remarks'],
  sr: ['sr.no', 'sr.n', 'sr no', 'sr', 's.no', 'sno', '#', 'no'],
}

export const TRACKING_COLUMNS = [
  'Email Status',
  'Email Sent At',
  'Opens',
  'Last Opened',
  'Clicks',
  'Campaign',
]

function normalizeHeader(cell) {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_./]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function cellText(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim()
    if (value.hyperlink) return String(value.hyperlink).trim()
    if (value.result != null) return String(value.result).trim()
    if (Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text || '').join('').trim()
    }
  }
  return String(value).trim()
}

function mapHeadersFromCells(cells) {
  const normalized = cells.map(normalizeHeader)
  const map = {}
  for (const [field, aliases] of Object.entries(LEAD_HEADER_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeHeader)
    const idx = normalized.findIndex((c) => normalizedAliases.includes(c))
    if (idx >= 0) map[field] = idx
  }
  return map
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const map = mapHeadersFromCells(rows[i] || [])
    if (map.email != null) return { headerRowIndex: i, columnMap: map }
  }
  return null
}

export function parseLocation(locationRaw = '') {
  const raw = String(locationRaw || '').trim()
  if (!raw) return { location: '', city: '', country: '', region: '' }
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const country = parts[parts.length - 1]
    const city = parts.slice(0, -1).join(', ')
    return { location: raw, city, country, region: country }
  }
  return { location: raw, city: raw, country: raw, region: raw }
}

export function isValidLeadEmail(email) {
  const e = String(email || '').trim()
  if (!e || NO_EMAIL_RE.test(e)) return false
  return EMAIL_RE.test(e)
}

function alreadyEmailed(updateText = '') {
  return /email\s*sent/i.test(String(updateText || ''))
}

export function buildLeadMergeData(row, sheetName = '', bookingUrl = '') {
  const loc = parseLocation(row.location)
  const name = String(row.name || '').trim()
  const firstName = name.split(/\s+/).filter(Boolean)[0] || ''
  const company = String(row.company || '').trim()
  const industry = String(row.industry || '').trim()
  const designation = String(row.designation || '').trim()
  const meetingLink =
    String(bookingUrl || '').trim() ||
    String(row.meetingLink || '').trim() ||
    process.env.GOOGLE_CALENDAR_BOOKING_URL?.trim() ||
    ''

  const place =
    loc.city && loc.country && loc.city !== loc.country
      ? `${loc.city}, ${loc.country}`
      : loc.country || loc.city || sheetName || 'your market'

  const industryBit = industry ? `${industry} ` : ''
  const punchOptions = [
    `Most ${industryBit}teams in ${place} still lose weeks to agency handoffs and half-finished builds.`,
    `${place} is moving fast, and the teams that ship web, mobile, and desktop in one stack are pulling ahead.`,
    `The real pain for ${industryBit}founders in ${place} is not ideas. It is reliable delivery without the agency tax.`,
    `If ${company || 'your team'} still juggles freelancers for web, mobile, and desktop, that gap is costing you speed.`,
    `Teams in ${place} are already consolidating product work with one senior builder. Waiting is the expensive option.`,
  ]
  // Stable pick from email so the same lead always gets the same punch line
  const seed = String(row.email || name || place)
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0)
  const fomoLine = punchOptions[seed % punchOptions.length]

  const greeting = firstName ? `Hi ${firstName}` : name ? `Hi ${name}` : 'Hi there'
  const nichePain = buildNichePain({ industry, company, place })
  const nichePainShort = buildNichePainShort({ industry })

  return {
    email: row.email,
    name,
    firstName,
    designation,
    company,
    industry,
    niche: industry,
    linkedin: row.linkedin || '',
    location: loc.location,
    city: loc.city,
    country: loc.country,
    region: loc.region || sheetName,
    sheetName,
    companyLabel: company || 'your company',
    nicheLabel: industry || company || 'your industry',
    greeting,
    fomoLine,
    nichePain,
    nichePainShort,
    meetingLink,
    update: row.update || '',
    rowNumber: row.rowNumber,
  }
}

function rowsFromWorksheet(ws) {
  const rows = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellText(cell.value)
    })
    // Fill holes so indices align
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] == null) cells[i] = ''
    }
    rows.push(cells)
  })
  return rows
}

function parseSheetRows(sheetName, rows, options = {}) {
  const { skipAlreadyEmailed = true } = options
  const found = findHeaderRow(rows)
  if (!found) {
    return {
      sheetName,
      ok: false,
      error: 'No email header found',
      columnMap: {},
      headerRowIndex: -1,
      leads: [],
      skipped: [],
      quarantine: [],
    }
  }

  const { headerRowIndex, columnMap } = found
  const leads = []
  const quarantine = []
  const skipped = []

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const parts = rows[r] || []
    const get = (key) => {
      const i = columnMap[key]
      return i != null ? String(parts[i] || '').trim() : ''
    }
    const emailRaw = get('email')
    const update = get('update')
    const rowNumber = r + 1 // 1-based for Excel display

    if (!emailRaw) continue

    if (!isValidLeadEmail(emailRaw)) {
      quarantine.push({
        sheetName,
        rowNumber,
        email: emailRaw,
        reason: NO_EMAIL_RE.test(emailRaw) ? 'no_email' : 'invalid_email',
        name: get('name'),
        company: get('company'),
      })
      continue
    }

    if (skipAlreadyEmailed && alreadyEmailed(update)) {
      skipped.push({
        sheetName,
        rowNumber,
        email: emailRaw.toLowerCase(),
        reason: 'already_emailed',
      })
      continue
    }

    const lead = {
      email: emailRaw.toLowerCase(),
      name: get('name'),
      designation: get('designation'),
      company: get('company'),
      linkedin: get('linkedin'),
      location: get('location'),
      industry: get('industry'),
      update,
      sheetName,
      rowNumber,
    }
    lead.mergeData = buildLeadMergeData(lead, sheetName, options.bookingUrl || '')
    leads.push(lead)
  }

  return {
    sheetName,
    ok: true,
    columnMap,
    headerRowIndex,
    headers: rows[headerRowIndex] || [],
    leads,
    skipped,
    quarantine,
    totalRows: rows.length - headerRowIndex - 1,
  }
}

export async function parseWorkbookBuffer(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheets = []
  for (const ws of workbook.worksheets) {
    const rows = rowsFromWorksheet(ws)
    sheets.push(parseSheetRows(ws.name, rows, options))
  }

  return summarizeSheets(sheets, options)
}

export function parseCsvText(text, sheetName = 'Sheet1', options = {}) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim())
  const delim = lines[0]?.includes('\t') ? '\t' : lines[0]?.includes(';') ? ';' : ','
  const rows = lines.map((line) => line.split(delim).map((c) => c.replace(/^"|"$/g, '').trim()))
  return summarizeSheets([parseSheetRows(sheetName, rows, options)], options)
}

function summarizeSheets(sheets, { sheetNames, dedupe = true } = {}) {
  const selected =
    sheetNames?.length > 0
      ? sheets.filter((s) => sheetNames.includes(s.sheetName))
      : sheets

  const allLeads = []
  const quarantine = []
  const skipped = []
  const seen = new Set()

  for (const sheet of selected) {
    quarantine.push(...(sheet.quarantine || []))
    skipped.push(...(sheet.skipped || []))
    for (const lead of sheet.leads || []) {
      if (dedupe && seen.has(lead.email)) {
        skipped.push({
          sheetName: lead.sheetName,
          rowNumber: lead.rowNumber,
          email: lead.email,
          reason: 'duplicate',
        })
        continue
      }
      seen.add(lead.email)
      allLeads.push(lead)
    }
  }

  return {
    sheets: sheets.map((s) => ({
      sheetName: s.sheetName,
      ok: s.ok,
      error: s.error,
      columnMap: s.columnMap,
      headerRowIndex: s.headerRowIndex,
      leadCount: s.leads?.length || 0,
      skippedCount: s.skipped?.length || 0,
      quarantineCount: s.quarantine?.length || 0,
      preview: (s.leads || []).slice(0, 5).map((l) => ({
        email: l.email,
        name: l.name,
        company: l.company,
        designation: l.designation,
        location: l.location,
        industry: l.industry,
        rowNumber: l.rowNumber,
      })),
    })),
    leads: allLeads,
    quarantine,
    skipped,
    stats: {
      sheets: sheets.length,
      selectedSheets: selected.length,
      leads: allLeads.length,
      skipped: skipped.length,
      quarantine: quarantine.length,
    },
  }
}

export function extractSpreadsheetId(urlOrId) {
  const raw = String(urlOrId || '').trim()
  if (!raw) return null
  if (/^[a-zA-Z0-9-_]{20,}$/.test(raw) && !raw.includes('/')) return raw
  const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return m?.[1] || null
}

/** Ensure tracking columns exist; return col indexes (1-based) and header row. */
export async function ensureTrackingColumns(workbook, sheetName) {
  const ws = workbook.getWorksheet(sheetName)
  if (!ws) return null
  const rows = rowsFromWorksheet(ws)
  const found = findHeaderRow(rows)
  if (!found) return null

  const { headerRowIndex, columnMap } = found
  const headerRow = ws.getRow(headerRowIndex + 1)
  let maxCol = 0
  headerRow.eachCell({ includeEmpty: true }, (_c, col) => {
    if (col > maxCol) maxCol = col
  })

  const trackingMap = {}
  const existing = {}
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    existing[normalizeHeader(cellText(cell.value))] = col
  })

  for (const label of TRACKING_COLUMNS) {
    const key = normalizeHeader(label)
    if (existing[key]) {
      trackingMap[label] = existing[key]
    } else {
      maxCol += 1
      headerRow.getCell(maxCol).value = label
      trackingMap[label] = maxCol
    }
  }
  headerRow.commit()

  return {
    headerRowIndex,
    columnMap,
    trackingMap,
    emailCol: (columnMap.email ?? 0) + 1,
    updateCol: columnMap.update != null ? columnMap.update + 1 : null,
  }
}

export async function patchWorkbookStatus(buffer, updates) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  // updates: [{ sheetName, email, status, sentAt, opens, lastOpened, clicks, campaign, appendUpdate }]
  const bySheet = new Map()
  for (const u of updates) {
    if (!bySheet.has(u.sheetName)) bySheet.set(u.sheetName, [])
    bySheet.get(u.sheetName).push(u)
  }

  for (const [sheetName, sheetUpdates] of bySheet) {
    const meta = await ensureTrackingColumns(workbook, sheetName)
    if (!meta) continue
    const ws = workbook.getWorksheet(sheetName)
    const emailIndex = meta.emailCol

    const rowByEmail = new Map()
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= meta.headerRowIndex + 1) return
      const email = cellText(row.getCell(emailIndex).value).toLowerCase()
      if (email) rowByEmail.set(email, row)
    })

    for (const u of sheetUpdates) {
      const row = rowByEmail.get(String(u.email || '').toLowerCase())
      if (!row) continue
      const set = (label, value) => {
        const col = meta.trackingMap[label]
        if (col) row.getCell(col).value = value ?? ''
      }
      if (u.status != null) set('Email Status', u.status)
      if (u.sentAt != null) set('Email Sent At', u.sentAt)
      if (u.opens != null) set('Opens', u.opens)
      if (u.lastOpened != null) set('Last Opened', u.lastOpened)
      if (u.clicks != null) set('Clicks', u.clicks)
      if (u.campaign != null) set('Campaign', u.campaign)

      if (u.appendUpdate && meta.updateCol) {
        const prev = cellText(row.getCell(meta.updateCol).value)
        if (!/email\s*sent/i.test(prev)) {
          row.getCell(meta.updateCol).value = prev
            ? `${prev} | email sent`
            : 'email sent'
        }
      }
      row.commit()
    }
  }

  const out = await workbook.xlsx.writeBuffer()
  return Buffer.from(out)
}
