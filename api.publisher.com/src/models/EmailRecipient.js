import mongoose from 'mongoose'

const emailRecipientSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      required: true,
      index: true,
    },
    email: { type: String, required: true },
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
    /** inbox | junk — soft trash for mailbox UI */
    mailboxFolder: {
      type: String,
      enum: ['inbox', 'junk'],
      default: 'inbox',
      index: true,
    },
  },
  { timestamps: true },
)

emailRecipientSchema.index({ campaignId: 1, email: 1 })
emailRecipientSchema.index({ workspaceId: 1, status: 1, sentAt: -1 })
emailRecipientSchema.index({ workspaceId: 1, meetingStatus: 1 })
emailRecipientSchema.index({ workspaceId: 1, createdAt: -1 })
emailRecipientSchema.index({ workspaceId: 1, mailboxFolder: 1 })

export const EmailRecipient = mongoose.model('EmailRecipient', emailRecipientSchema)
