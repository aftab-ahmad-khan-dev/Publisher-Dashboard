export const AUTH_USERNAME = 'Joseph Morgan'
export const AUTH_USERNAME_ALIASES = ['Joseph Morgan', 'Josehph Morgan']
export const AUTH_PASSWORD = 'Morgan'

export const COMMUNITY_PLATFORMS = ['reddit', 'quora']

export const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin', 'reddit', 'quora']

export const DEFAULT_PLATFORMS = {
  instagram: true,
  facebook: true,
  linkedin: true,
  reddit: false,
  quora: false,
}

export const DEFAULT_IMAGE_VISIBILITY = {
  instagram: true,
  facebook: true,
  linkedin: true,
  reddit: false,
  quora: false,
}

export const PLATFORM_META = {
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    short: 'IG',
    color: 'from-[#E1306C] to-[#F77737]',
    solid: '#E1306C',
    suite: 'Meta Suite',
    gradient: true,
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook',
    short: 'FB',
    color: 'bg-[#1877F2]',
    solid: '#1877F2',
    suite: 'Meta Suite',
  },
  linkedin: {
    key: 'linkedin',
    label: 'LinkedIn',
    short: 'LI',
    color: 'bg-[#0A66C2]',
    solid: '#0A66C2',
    suite: 'Professional',
  },
  reddit: {
    key: 'reddit',
    label: 'Reddit',
    short: 'RD',
    color: 'bg-[#FF4500]',
    solid: '#FF4500',
    suite: 'Community',
    community: true,
    policyHint: 'Share experiences, guides, and honest takes — not ads or link spam.',
  },
  quora: {
    key: 'quora',
    label: 'Quora',
    short: 'Q',
    color: 'bg-[#B92B27]',
    solid: '#B92B27',
    suite: 'Community',
    community: true,
    policyHint: 'Write expertise-driven answers — Quora penalizes promotional posts.',
  },
}

export const NAV_ITEMS = [
  { path: '/compose', label: 'Compose', icon: 'compose' },
  { path: '/email', label: 'Bulk Email', icon: 'email' },
  { path: '/bulk', label: 'Bulk Upload', icon: 'bulk' },
  { path: '/drafts', label: 'Drafts', icon: 'drafts' },
  { path: '/scheduled', label: 'Scheduled', icon: 'scheduled' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { path: '/api-config', label: 'API Config', icon: 'api' },
]
