export const AUTH_USERNAME = 'Joseph Morgan'
export const AUTH_USERNAME_ALIASES = ['Joseph Morgan', 'Josehph Morgan']
export const AUTH_PASSWORD = 'Morgan'

export const COMMUNITY_PLATFORMS = ['reddit', 'quora']

/** Platforms with native poll publishing in this app. */
export const POLL_PLATFORMS = ['linkedin', 'reddit']

export const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin', 'reddit', 'threads']

export const DEFAULT_PLATFORMS = {
  instagram: true,
  facebook: true,
  linkedin: true,
  reddit: false,
  threads: true,
}

/** Platforms that can include the attached image when publishing. */
export const IMAGE_VISIBILITY_PLATFORMS = [
  'instagram',
  'facebook',
  'linkedin',
  'reddit',
  'threads',
]

export const DEFAULT_IMAGE_VISIBILITY = {
  instagram: true,
  facebook: true,
  linkedin: true,
  reddit: false,
  pinterest: true,
  threads: true,
}

/** Max images per composer or bulk upload batch. */
export const MAX_UPLOAD_IMAGES = 30

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
    supportsPoll: true,
  },
  reddit: {
    key: 'reddit',
    label: 'Reddit',
    short: 'RD',
    color: 'bg-[#FF4500]',
    solid: '#FF4500',
    suite: 'Community',
    community: true,
    supportsPoll: true,
    policyHint: 'Share experiences, guides, and honest takes, not ads or link spam.',
  },
  quora: {
    key: 'quora',
    label: 'Quora',
    short: 'Q',
    color: 'bg-[#B92B27]',
    solid: '#B92B27',
    suite: 'Community',
    community: true,
    policyHint: 'Write expertise-driven answers, Quora penalizes promotional posts.',
  },
  pinterest: {
    key: 'pinterest',
    label: 'Pinterest',
    short: 'PIN',
    color: 'bg-[#E60023]',
    solid: '#E60023',
    suite: 'Visual',
    needsImage: true,
    policyHint: 'Pinterest Pins require an image — attach one before publishing.',
  },
  threads: {
    key: 'threads',
    label: 'Threads',
    short: 'TH',
    color: 'bg-black',
    solid: '#000000',
    suite: 'Social',
  },
  gmail: {
    key: 'gmail',
    label: 'Gmail',
    short: 'GM',
    color: 'bg-white',
    solid: '#EA4335',
    suite: 'Email',
  },
}

export const NAV_ITEMS = [
  { path: '/compose', label: 'Compose', icon: 'compose' },
  { path: '/email', label: 'Mail Box', icon: 'email' },
  { path: '/bulk', label: 'Bulk Upload', icon: 'bulk' },
  { path: '/drafts', label: 'Drafts', icon: 'drafts' },
  { path: '/scheduled', label: 'Scheduled', icon: 'scheduled' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { path: '/api-config', label: 'Integrations', icon: 'api' },
  { path: '/billing', label: 'Billing', icon: 'billing' },
  { path: '/guide', label: 'Setup Guide', icon: 'guide' },
]

/** Grouped sidebar navigation for premium SaaS layout. */
export const NAV_GROUPS = [
  {
    id: 'create',
    label: 'Create',
    items: [
      { path: '/compose', label: 'Compose', icon: 'compose', description: 'Write & publish' },
      { path: '/bulk', label: 'Bulk Upload', icon: 'bulk', description: 'Multi-post days' },
      { path: '/email', label: 'Mail Box', icon: 'email', description: 'Outreach & campaigns' },
    ],
  },
  {
    id: 'library',
    label: 'Content',
    items: [
      { path: '/drafts', label: 'Drafts', icon: 'drafts', description: 'Saved work' },
      { path: '/scheduled', label: 'Scheduled', icon: 'scheduled', description: 'Queue' },
      { path: '/calendar', label: 'Calendar', icon: 'calendar', description: 'Timeline' },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { path: '/api-config', label: 'Integrations', icon: 'api', description: 'API keys' },
      { path: '/billing', label: 'Billing', icon: 'billing', description: 'Plans & payment' },
      { path: '/guide', label: 'Setup Guide', icon: 'guide', description: 'Onboarding' },
    ],
  },
]
