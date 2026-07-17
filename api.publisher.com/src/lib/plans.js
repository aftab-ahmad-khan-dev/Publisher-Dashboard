/** Server-side plan definitions and feature gates. */

export const PLAN_PRICES = {
  starter: 19.99,
  growth: 39.99,
  pro: 49.99,
}

export const PLAN_FEATURES = {
  none: [],
  starter: ['compose', 'bulk'],
  growth: ['compose', 'bulk', 'email'],
  pro: [
    'compose',
    'bulk',
    'email',
    'drafts',
    'scheduled',
    'calendar',
    'api',
    'guide',
    'admin',
    'billing',
  ],
}

/** Features unpaid users may still open (billing only). */
export const ALWAYS_ALLOWED = ['billing']

export const BANK_DETAILS = [
  {
    id: 'jazzcash',
    name: 'JazzCash',
    accountTitle: 'Aftab Ahmad',
    accountNumber: '+92-3042626916',
    iban: '',
    branch: '',
    note: 'Mobile wallet — send to this JazzCash number',
  },
  {
    id: 'ubl',
    name: 'UBL',
    accountTitle: 'Aftab Ahmad',
    accountNumber: '1149288702243',
    iban: 'PK45UNIL0109000288702243',
    branch: '',
    note: 'United Bank Limited',
  },
  {
    id: 'nayapay',
    name: 'NayaPay',
    accountTitle: 'Aftab Ahmad',
    accountNumber: '+92-3224597697',
    iban: '',
    branch: '',
    note: 'NayaPay mobile wallet',
  },
  {
    id: 'meezan',
    name: 'Meezan Bank',
    accountTitle: 'AFTAB AHMAD',
    accountNumber: '00300108876278',
    iban: 'PK23MEZN0000300108876278',
    branch: 'MEEZAN DIGITAL CENTRE',
    note: 'Meezan Bank',
  },
]

export function planAllows(plan, feature) {
  if (ALWAYS_ALLOWED.includes(feature)) return true
  const allowed = PLAN_FEATURES[plan] || PLAN_FEATURES.none
  if (plan === 'pro') return true
  return allowed.includes(feature)
}

export function effectivePlan({ plan, status, isAdmin }) {
  if (isAdmin) return 'pro'
  if (status === 'active' && plan && plan !== 'none') return plan
  return 'none'
}
