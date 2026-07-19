export const PIPELINE_STAGES = [
  { id: 'new', label: 'New', color: '#38bdf8', accent: 'sky' },
  { id: 'proposal', label: 'Proposal', color: '#a78bfa', accent: 'violet' },
  { id: 'deposit', label: 'Deposit', color: '#fbbf24', accent: 'amber' },
  { id: 'follow_up_ongoing', label: 'Follow-Up Ongoing', color: '#fb923c', accent: 'orange' },
  { id: 'meeting_follow_up', label: 'Meeting Follow-Up', color: '#818cf8', accent: 'indigo' },
  { id: 'won', label: 'Won', color: '#34d399', accent: 'emerald' },
  { id: 'lost', label: 'Lost', color: '#fb7185', accent: 'rose' },
]

export const STAGE_LABELS = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.label]),
)

export const CRM_MEETING_OUTCOMES = [
  { id: '', label: '—' },
  { id: 'show', label: 'Show' },
  { id: 'no_show', label: 'No-Show' },
  { id: 'rescheduled_us', label: 'Rescheduled By Us' },
  { id: 'rescheduled_them', label: 'Rescheduled By Them' },
  { id: 'cancel', label: 'Cancel' },
  { id: 'dq', label: 'DQ' },
]

export const SALE_TYPES = [
  { id: '', label: '—' },
  { id: 'one_call', label: '1-Call Sale' },
  { id: 'follow_up', label: 'Follow-Up Sale' },
]

export const LOSS_REASONS = [
  { id: 'price', label: 'Price' },
  { id: 'timing', label: 'Timing' },
  { id: 'partner_spouse', label: 'Partner-Spouse' },
  { id: 'competitor', label: 'Competitor' },
  { id: 'ghosted', label: 'Ghosted' },
  { id: 'not_qualified', label: 'Not Qualified' },
]

export const LOSS_REASON_LABELS = Object.fromEntries(
  LOSS_REASONS.map((r) => [r.id, r.label]),
)

export function formatMoney(n) {
  const v = Number(n) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v)
}

export function formatMoneyExact(n) {
  const v = Number(n) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v)
}

export function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function formatDateTimeLocal(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export function toIsoOrNull(localValue) {
  if (!localValue) return null
  const d = new Date(localValue)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function emptyLeadForm(overrides = {}) {
  return {
    name: '',
    email: '',
    company: '',
    phone: '',
    source: '',
    setterName: '',
    closerName: '',
    pipelineStage: 'new',
    firstContactAt: '',
    meetingBookedAt: '',
    meetingDateAt: '',
    lastTouchAt: '',
    crmMeetingOutcome: '',
    offerMade: false,
    saleType: '',
    lossReason: '',
    depositAmount: 0,
    totalDealValue: 0,
    cashCollected: 0,
    datePaidInFull: '',
    refundAmount: 0,
    commissionPercent: 0,
    ...overrides,
  }
}

export function leadToForm(lead) {
  return emptyLeadForm({
    name: lead.name || '',
    email: lead.email?.endsWith('@crm.local') ? '' : lead.email || '',
    company: lead.company || '',
    phone: lead.phone || '',
    source: lead.source || '',
    setterName: lead.setterName || '',
    closerName: lead.closerName || '',
    pipelineStage: lead.pipelineStage || 'new',
    firstContactAt: formatDateTimeLocal(lead.firstContactAt),
    meetingBookedAt: formatDateTimeLocal(lead.meetingBookedAt),
    meetingDateAt: formatDateTimeLocal(lead.meetingDateAt),
    lastTouchAt: formatDateTimeLocal(lead.lastTouchAt),
    crmMeetingOutcome: lead.crmMeetingOutcome || '',
    offerMade: Boolean(lead.offerMade),
    saleType: lead.saleType || '',
    lossReason: lead.lossReason || '',
    depositAmount: lead.depositAmount || 0,
    totalDealValue: lead.totalDealValue || 0,
    cashCollected: lead.cashCollected || 0,
    datePaidInFull: formatDateTimeLocal(lead.datePaidInFull)?.slice(0, 10) || '',
    refundAmount: lead.refundAmount || 0,
    commissionPercent: lead.commissionPercent || 0,
  })
}

export function formToPayload(form) {
  return {
    name: form.name,
    email: form.email,
    company: form.company,
    phone: form.phone,
    source: form.source,
    setterName: form.setterName,
    closerName: form.closerName,
    pipelineStage: form.pipelineStage,
    firstContactAt: toIsoOrNull(form.firstContactAt),
    meetingBookedAt: toIsoOrNull(form.meetingBookedAt),
    meetingDateAt: toIsoOrNull(form.meetingDateAt),
    lastTouchAt: toIsoOrNull(form.lastTouchAt),
    crmMeetingOutcome: form.crmMeetingOutcome,
    offerMade: Boolean(form.offerMade),
    saleType: form.saleType,
    lossReason: form.lossReason,
    depositAmount: Number(form.depositAmount) || 0,
    totalDealValue: Number(form.totalDealValue) || 0,
    cashCollected: Number(form.cashCollected) || 0,
    datePaidInFull: form.datePaidInFull
      ? toIsoOrNull(`${form.datePaidInFull}T12:00`)
      : null,
    refundAmount: Number(form.refundAmount) || 0,
    commissionPercent: Number(form.commissionPercent) || 0,
  }
}

export function leakLabel(flags = {}) {
  const parts = []
  if (flags.bookingLag) parts.push('Booking lag >4d')
  if (flags.followUpAging) parts.push('Follow-up aging 7d+')
  if (flags.depositUnpaid) parts.push('Deposit unpaid 14d+')
  return parts
}
