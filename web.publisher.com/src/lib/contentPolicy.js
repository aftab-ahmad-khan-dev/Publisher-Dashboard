import { containsForbiddenDash } from './contentSanitize.js'

export const COMMUNITY_PLATFORMS = ['reddit', 'quora']

const PROMO_PATTERNS = [
  { re: /\b(buy now|shop now|limited time|act fast|don't miss|hurry)\b/i, msg: 'Urgency / sales language' },
  { re: /\b(\d+%\s*off|discount|promo code|coupon|use code|special offer)\b/i, msg: 'Discount or promo wording' },
  { re: /\b(sign up now|subscribe now|book a call|dm me for|link in bio|click here to)\b/i, msg: 'Direct CTA' },
  { re: /\b(our (product|service|app|course|saas|platform)|we offer|we provide|hire us|work with us)\b/i, msg: 'Brand/product pitch' },
  { re: /\b(best in class|industry[- ]leading|#1 rated|guaranteed results)\b/i, msg: 'Marketing superlative' },
]

const INFO_SIGNALS = [
  /\b(how to|here's how|step[- ]by[- ]step|in my experience|lessons learned|what i learned)\b/i,
  /\b(tip:|note:|overview|summary|guide|explainer|because|reason is)\b/i,
  /\?$/,
]

function linkCount(text) {
  return (text.match(/https?:\/\/[^\s]+/gi) || []).length
}

export function redditTitleFromBody(body) {
  const first = (body || '').trim().split('\n')[0]?.trim() || ''
  if (first.length >= 10 && first.length <= 300) return first
  const slice = (body || '').trim().slice(0, 280)
  return slice.length < (body || '').trim().length ? `${slice}…` : slice || 'Discussion'
}

export function analyzeCommunityContent(body, { platforms = [] } = {}) {
  const text = (body || '').trim()
  const issues = []
  const needsCommunity = platforms.some((p) => COMMUNITY_PLATFORMS.includes(p))

  if (!needsCommunity) {
    return { ok: true, tone: 'neutral', score: 100, issues: [], needsCommunity: false }
  }

  if (containsForbiddenDash(text)) {
    issues.push({
      severity: 'error',
      message: 'Em dashes (—) are not allowed. Use a comma or period instead.',
    })
  }

  if (text.length < 80) {
    issues.push({
      severity: 'error',
      message: 'Community posts need more substance (at least ~80 characters of helpful detail).',
    })
  }

  for (const { re, msg } of PROMO_PATTERNS) {
    if (re.test(text)) {
      issues.push({ severity: 'error', message: `Sounds promotional: ${msg}.` })
    }
  }

  const links = linkCount(text)
  if (links >= 2) {
    issues.push({
      severity: 'error',
      message: 'Multiple links look like promotion. Use one contextual link at most.',
    })
  } else if (links === 1 && text.length < 200) {
    issues.push({
      severity: 'warn',
      message: 'Short post with a link can read as spam. Add more context around the link.',
    })
  }

  const hashtagCount = (text.match(/#\w+/g) || []).length
  if (hashtagCount > 2) {
    issues.push({
      severity: 'warn',
      message: 'Heavy hashtags feel promotional on Reddit & Quora. Prefer plain language.',
    })
  }

  const capsRatio = (text.replace(/[^A-Z]/g, '').length / Math.max(text.length, 1))
  if (capsRatio > 0.25 && text.length > 40) {
    issues.push({ severity: 'warn', message: 'Lots of ALL CAPS reads like shouting or ads.' })
  }

  const infoHits = INFO_SIGNALS.filter((re) => re.test(text)).length
  const tone =
    issues.some((i) => i.severity === 'error')
      ? 'promotional'
      : infoHits >= 1
        ? 'informational'
        : 'neutral'

  let score = 70
  if (text.length >= 120) score += 10
  if (infoHits >= 1) score += 15
  if (issues.some((i) => i.severity === 'error')) score -= 40
  if (issues.some((i) => i.severity === 'warn')) score -= 10
  score = Math.max(0, Math.min(100, score))

  const ok = !issues.some((i) => i.severity === 'error')

  return { ok, tone, score, issues, needsCommunity }
}

export function validateCommunityPublish(body, platforms, postState) {
  if (postState?.poll?.enabled) {
    return { ok: true, analysis: { ok: true, tone: 'neutral', score: 100, issues: [], needsCommunity: false } }
  }
  const analysis = analyzeCommunityContent(body, { platforms })
  if (!analysis.needsCommunity || analysis.ok) {
    return { ok: true, analysis }
  }
  const first = analysis.issues.find((i) => i.severity === 'error')
  return {
    ok: false,
    error: first?.message || 'Content does not meet Reddit/Quora informational guidelines.',
    analysis,
  }
}
