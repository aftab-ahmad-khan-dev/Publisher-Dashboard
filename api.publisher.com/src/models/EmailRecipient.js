import mongoose from 'mongoose'

const PIPELINE_STAGES = [
  '',
  'new',
  'proposal',
  'deposit',
  'follow_up_ongoing',
  'meeting_follow_up',
  'won',
  'lost',
]

const CRM_MEETING_OUTCOMES = [
  '',
  'show',
  'no_show',
  'rescheduled_us',
  'rescheduled_them',
  'cancel',
  'dq',
]

const SALE_TYPES = ['', 'one_call', 'follow_up']

const LOSS_REASONS = [
  '',
  'price',
  'timing',
  'partner_spouse',
  'competitor',
  'ghosted',
  'not_qualified',
]

const emailRecipientSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      required: false,
      index: true,
    },
    email: { type: String, default: '' },
    name: { type: String, default: '' },
    company: { type: String, default: '' },
    niche: { type: String, default: '' },
    designation: { type: String, default: '' },
    location: { type: String, default: '' },
    sheetName: { type: String, default: '' },
    rowNumber: Number,
    leadSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSource' },
    mergeData: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'failed', 'opened', 'clicked', 'cancelled'],
      default: 'queued',
    },
    trackingId: { type: String, index: true },
    gmailMessageId: String,
    renderedSubject: String,
    renderedText: String,
    renderedHtml: String,
    error: String,
    sentAt: Date,
    openedAt: Date,
    openCount: { type: Number, default: 0 },
    lastOpenedAt: Date,
    clickedAt: Date,
    clickCount: { type: Number, default: 0 },
    lastClickedUrl: String,
    /** calendar | portfolio | other — last classified click */
    lastClickKind: {
      type: String,
      enum: ['', 'calendar', 'portfolio', 'other'],
      default: '',
    },
    /** Recent click history for overview link-mix stats */
    clickEvents: [
      {
        url: { type: String, default: '' },
        kind: {
          type: String,
          enum: ['calendar', 'portfolio', 'other'],
          default: 'other',
        },
        at: { type: Date, default: Date.now },
      },
    ],
    /** none | invited | link_clicked | scheduled | completed | no_show */
    meetingStatus: {
      type: String,
      enum: ['none', 'invited', 'link_clicked', 'scheduled', 'completed', 'no_show'],
      default: 'none',
    },
    meetingLink: { type: String, default: '' },
    meetingClickedAt: Date,
    meetingScheduledAt: Date,
    /** IANA timezone from the Calendar event (lead booking zone), e.g. Europe/Stockholm */
    meetingTimeZone: { type: String, default: '' },
    meetingNotes: { type: String, default: '' },
    /** Google Calendar event id when invited/synced */
    calendarEventId: { type: String, default: '' },
    /** When we emailed the 5–10 min pre-meeting reminder */
    meetingReminderSentAt: Date,
    /** When guest was emailed Meet link + time confirmation */
    meetingConfirmSentAt: Date,
    /** Last follow-up / final-call / reason nudge sent */
    lastNudgeType: { type: String, default: '' },
    lastNudgeAt: Date,
    /**
     * Auto nudge pipeline stage:
     * '' = not started · final_call · reason · follow_up · done (finished or stopped)
     */
    nudgeAutoStage: {
      type: String,
      enum: ['', 'final_call', 'reason', 'follow_up', 'done'],
      default: '',
    },
    /** When engagement first qualified for auto nudges (open / meeting click) */
    nudgeEngagedAt: Date,
    /** meetingStatus snapshot — auto continues only while this stays the same */
    nudgeStatusSnapshot: { type: String, default: '' },
    /** Admin updated status (or booked) — stops remaining auto nudges */
    nudgeAutoStopped: { type: Boolean, default: false },
    /** inbox | junk — soft trash for mailbox UI */
    mailboxFolder: {
      type: String,
      enum: ['inbox', 'junk'],
      default: 'inbox',
      index: true,
    },

    /* ── Sales CRM fields ─────────────────────────────────────────────── */
    /** Empty = not on Sales board */
    pipelineStage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: '',
      index: true,
    },
    phone: { type: String, default: '' },
    source: { type: String, default: '' },
    setterName: { type: String, default: '' },
    closerName: { type: String, default: '' },
    firstContactAt: Date,
    meetingBookedAt: Date,
    meetingDateAt: Date,
    lastTouchAt: Date,
    crmMeetingOutcome: {
      type: String,
      enum: CRM_MEETING_OUTCOMES,
      default: '',
    },
    offerMade: { type: Boolean, default: false },
    saleType: {
      type: String,
      enum: SALE_TYPES,
      default: '',
    },
    lossReason: {
      type: String,
      enum: LOSS_REASONS,
      default: '',
    },
    depositAmount: { type: Number, default: 0 },
    totalDealValue: { type: Number, default: 0 },
    cashCollected: { type: Number, default: 0 },
    datePaidInFull: Date,
    refundAmount: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 0 },
    /** When deposit was first recorded (for unpaid aging) */
    depositAt: Date,
  },
  { timestamps: true },
)

emailRecipientSchema.index({ campaignId: 1, email: 1 })
emailRecipientSchema.index({ workspaceId: 1, status: 1, sentAt: -1 })
emailRecipientSchema.index({ workspaceId: 1, meetingStatus: 1 })
emailRecipientSchema.index({ workspaceId: 1, createdAt: -1 })
emailRecipientSchema.index({ workspaceId: 1, mailboxFolder: 1 })
emailRecipientSchema.index({ workspaceId: 1, pipelineStage: 1 })
emailRecipientSchema.index({ workspaceId: 1, setterName: 1 })
emailRecipientSchema.index({ workspaceId: 1, closerName: 1 })
emailRecipientSchema.index({ workspaceId: 1, lastTouchAt: 1 })

export const PIPELINE_STAGE_VALUES = PIPELINE_STAGES.filter(Boolean)
export const CRM_MEETING_OUTCOME_VALUES = CRM_MEETING_OUTCOMES.filter(Boolean)
export const SALE_TYPE_VALUES = SALE_TYPES.filter(Boolean)
export const LOSS_REASON_VALUES = LOSS_REASONS.filter(Boolean)

export const EmailRecipient = mongoose.model('EmailRecipient', emailRecipientSchema)
