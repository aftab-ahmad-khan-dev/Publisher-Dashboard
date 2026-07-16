/** Parse recipients + merge fields for pain-focused, business-personalized outreach */

import { containsForbiddenDash, sanitizePublishedText } from './contentSanitize.js'
import { applyEmailContentShuffle, hashSeed } from './emailShuffle.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HEADER_ALIASES = {
  email: ['email', 'e-mail', 'mail'],
  name: ['name', 'full name', 'contact', 'recipient'],
  company: ['company', 'business', 'organization', 'organisation', 'org', 'firm'],
  niche: ['niche', 'industry', 'vertical', 'sector', 'category', 'business niche', 'market'],
}

function normalizeHeader(cell) {
  return cell.trim().toLowerCase().replace(/[_-]+/g, ' ')
}

function mapHeaders(headerLine, delim) {
  const cells = headerLine.split(delim).map(normalizeHeader)
  const map = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = cells.findIndex((c) => aliases.includes(c))
    if (idx >= 0) map[field] = idx
  }
  return map
}

export function buildMergeData({ email, name = '', company = '', niche = '' }) {
  const nameTrim = String(name || '').trim()
  const firstName = nameTrim.split(/\s+/).filter(Boolean)[0] || ''
  const companyTrim = company.trim()
  const nicheTrim = niche.trim()
  const business = companyTrim || nicheTrim
  const nicheLabel = nicheTrim || companyTrim || 'your industry'
  const companyLabel = companyTrim || 'your company'
  // Prefer real name; never leave "Hi there" when a name is available
  const greeting = firstName ? `Hi ${firstName}` : nameTrim ? `Hi ${nameTrim}` : 'Hi there'

  let painOpener = 'Many teams in your space'
  if (companyTrim && nicheTrim) {
    painOpener = `Many ${nicheTrim} teams, including folks at ${companyTrim}`
  } else if (companyTrim) {
    painOpener = `Teams at ${companyTrim}`
  } else if (nicheTrim) {
    painOpener = `Many ${nicheTrim} businesses`
  }

  return {
    email,
    name: nameTrim,
    firstName,
    company: companyTrim,
    niche: nicheTrim,
    business,
    industry: nicheTrim,
    companyLabel,
    nicheLabel,
    businessLabel: business || 'your business',
    greeting,
    painOpener,
  }
}

function rowFromParts(parts, columnMap) {
  if (columnMap && columnMap.email != null) {
    const get = (key) => {
      const i = columnMap[key]
      return i != null ? (parts[i] || '').trim() : ''
    }
    const email = get('email').toLowerCase()
    if (!EMAIL_RE.test(email)) return null
    return buildMergeData({
      email,
      name: get('name'),
      company: get('company'),
      niche: get('niche'),
    })
  }

  let email = ''
  let name = ''
  let company = ''
  let niche = ''

  if (parts.length >= 2 && EMAIL_RE.test(parts[0])) {
    email = parts[0].toLowerCase()
    name = parts[1] || ''
    company = parts[2] || ''
    niche = parts[3] || parts[2] || ''
  } else if (parts.length >= 2 && EMAIL_RE.test(parts[1])) {
    name = parts[0]
    email = parts[1].toLowerCase()
    company = parts[2] || ''
    niche = parts[3] || ''
  } else if (EMAIL_RE.test(parts[0])) {
    email = parts[0].toLowerCase()
    name = parts[1] || ''
    company = parts[2] || ''
    niche = parts[3] || ''
  } else {
    const match = parts.join(',').match(/<?([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>?/)
    if (match) {
      email = match[1].toLowerCase()
      const rest = parts.join(' ').replace(match[0], '').trim()
      name = rest
    }
  }

  if (!email || !EMAIL_RE.test(email)) return null
  return buildMergeData({ email, name, company, niche })
}

export function parseRecipients(raw) {
  const text = (raw || '').replace(/\r\n/g, '\n').trim()
  if (!text) return []

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const delim = lines[0]?.includes('\t') ? '\t' : lines[0]?.includes(';') ? ';' : ','

  const isHeader =
    lines[0] && /email/i.test(lines[0]) && (lines[0].includes(',') || lines[0].includes('\t') || lines[0].includes(';'))

  const columnMap = isHeader ? mapHeaders(lines[0], delim) : null
  const dataLines = isHeader ? lines.slice(1) : lines

  const recipients = []
  for (const line of dataLines) {
    const parts = line.split(delim).map((p) => p.trim().replace(/^["']|["']$/g, ''))
    const merge = rowFromParts(parts, columnMap)
    if (!merge) continue
    recipients.push({
      email: merge.email,
      name: merge.name,
      company: merge.company,
      niche: merge.niche,
      mergeData: merge,
    })
  }

  const seen = new Set()
  return recipients.filter((r) => {
    if (seen.has(r.email)) return false
    seen.add(r.email)
    return true
  })
}

export function mergeTemplate(template, data) {
  if (!template) return ''
  const merged = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = data[key]
    return v != null ? String(v) : ''
  })
  // Never shuffle HTML — paragraph reordering can break CTA tables and swap
  // "Schedule a meeting" labels onto product/platform hrefs.
  const looksLikeHtml = /<\/?(?:html|table|a|p|div|td)\b/i.test(merged)
  if (looksLikeHtml) {
    return sanitizePublishedText(merged)
  }
  const seed = hashSeed(data.email || data._previewKey || 'preview')
  const varied = applyEmailContentShuffle(merged, seed)
  return sanitizePublishedText(varied)
}

/** Light check: email should lead with their pain, not your pitch */
export function analyzePainFocusedEmail(subject, body) {
  const text = `${subject}\n${body}`
  const issues = []

  if (containsForbiddenDash(text)) {
    issues.push({
      severity: 'error',
      message: 'Em dashes (—) are not allowed in email copy. Use a comma or period instead.',
    })
  }

  const selfPitch = [
    /\b(our (product|service|platform|agency|company|solution))\b/i,
    /\b(we offer|we provide|hire us|book a demo|schedule a call with us)\b/i,
    /\b(buy now|limited offer|%\s*off|free trial of our)\b/i,
  ]
  const painSignals = [
    /\b(struggle|challenge|pain|friction|bottleneck|slow|leak|churn|waste)\b/i,
    /\b(how (teams|founders|operators)|many .+ (face|deal with))\b/i,
    /\{\{\s*(niche|company|painOpener|business)\s*\}\}/i,
  ]

  for (const re of selfPitch) {
    if (re.test(text)) {
      issues.push({
        severity: 'warn',
        message: 'Sounds like you are selling yourself — refocus on the recipient’s problem.',
      })
      break
    }
  }

  const hasPain = painSignals.some((re) => re.test(text))
  if (!hasPain && text.length > 60) {
    issues.push({
      severity: 'info',
      message: 'Tip: mention their niche/company or a specific pain (use {{niche}}, {{company}}, {{painOpener}}).',
    })
  }

  return { ok: issues.every((i) => i.severity !== 'error'), issues }
}
