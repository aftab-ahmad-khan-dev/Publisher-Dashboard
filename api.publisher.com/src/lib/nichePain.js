/**
 * Niche-relative problem lines for outreach merge fields.
 */

function nicheKey(industry = '') {
  const s = String(industry || '').toLowerCase()
  if (/e-?comm|shopify|dtc|retail|store|marketplace/.test(s)) return 'ecommerce'
  if (/saas|software|b2b|tech|startup|app|platform|ai|ml/.test(s)) return 'saas'
  if (/agenc|market(ing)?|media|creative|design studio/.test(s)) return 'agency'
  if (/health|clinic|dental|medico|pharma|wellness/.test(s)) return 'health'
  if (/fintech|finance|bank|insur|account|lending/.test(s)) return 'finance'
  if (/real\s*estate|propert|broker|housing/.test(s)) return 'realestate'
  if (/educat|edtech|school|university|course|coach/.test(s)) return 'education'
  if (/logistic|supply|warehouse|shipping|freight/.test(s)) return 'logistics'
  if (/restaur|food|hospitality|hotel|cafe/.test(s)) return 'hospitality'
  if (/construct|architect|interior|build/.test(s)) return 'construction'
  if (/legal|law|attorney|solicitor/.test(s)) return 'legal'
  return 'general'
}

const NICHE_PROBLEMS = {
  ecommerce:
    'Checkout friction, weak mobile apps, and ops tools that do not keep up with inventory and campaigns',
  saas:
    'Slow product cycles, half-finished features, and stacking freelancers instead of one accountable build owner',
  agency:
    'Client delivery bottlenecks, handoff chaos, and custom tools that never quite fit the retainer model',
  health:
    'Patient-facing digital experiences that feel outdated, booking friction, and systems that do not talk to each other',
  finance:
    'Compliance-heavy workflows, clunky portals, and product UI that loses trust before the first conversion',
  realestate:
    'Lead leakage between portals, weak follow-up tools, and listing experiences that do not convert on mobile',
  education:
    'Enrollment drop-off, clunky learner portals, and content/tools scattered across too many platforms',
  logistics:
    'Tracking visibility gaps, manual coordination, and customer-facing status tools that lag the real operation',
  hospitality:
    'Booking drop-off, weak guest apps, and front-of-house tools that do not sync with operations',
  construction:
    'Project updates stuck in chats/spreadsheets, client portals that go stale, and no single source of truth',
  legal:
    'Client intake friction, document/status opacity, and portals that feel nothing like a modern practice',
  general:
    'Agency handoffs, slow cycles, and half-finished builds that never quite match how the business actually works',
}

/**
 * @param {{ industry?: string, niche?: string, company?: string, city?: string, country?: string, place?: string }} opts
 */
export function buildNichePain(opts = {}) {
  const industry = String(opts.industry || opts.niche || '').trim()
  const company = String(opts.company || '').trim()
  const place =
    String(opts.place || '').trim() ||
    [opts.city, opts.country].filter(Boolean).join(', ') ||
    ''

  const key = nicheKey(industry)
  const core = NICHE_PROBLEMS[key] || NICHE_PROBLEMS.general
  const nicheLabel = industry || 'your industry'
  const who = company
    ? `${nicheLabel} teams like ${company}`
    : place
      ? `${nicheLabel} teams in ${place}`
      : `${nicheLabel} teams`

  return `${who} still hit the same wall: ${core}`
}

export function buildNichePainShort(opts = {}) {
  const industry = String(opts.industry || opts.niche || '').trim()
  const key = nicheKey(industry)
  return NICHE_PROBLEMS[key] || NICHE_PROBLEMS.general
}
