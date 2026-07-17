import mongoose from 'mongoose'

const emailCampaignSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, default: 'Email campaign' },
    subject: { type: String, required: true },
    htmlBody: { type: String, default: '' },
    textBody: { type: String, default: '' },
    templates: {
      type: [{ subject: String, htmlBody: String, textBody: String, name: String }],
      default: [],
    },
    templateType: {
      type: String,
      enum: ['outreach', 'product', 'custom'],
      default: 'custom',
    },
    fromEmail: String,
    status: {
      type: String,
      enum: ['draft', 'sending', 'paused', 'completed', 'failed', 'cancelled'],
      default: 'draft',
    },
    trackOpens: { type: Boolean, default: true },
    /** Emails to send before a long rest (bulk). Default ~18 (clamped 15–20 in worker). */
    batchSize: { type: Number, default: 18 },
    batchDelayMs: { type: Number, default: 480000 },
    /** Long rest after each batch (bulk). Default 8 min — not between every email. */
    cooldownMs: { type: Number, default: 8 * 60 * 1000 },
    /** Sends completed in the current batch (resets after long rest). */
    sendsSinceBreak: { type: Number, default: 0 },
    /** When set, worker waits until this time before sending the next email. */
    nextSendAt: { type: Date, default: null },
    /** Max sends in rolling 24h for this workspace (enforced in worker). */
    dailyCap: { type: Number, default: 200 },
    leadSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSource' },
    meetingLink: { type: String, default: '' },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
    },
    error: String,
    startedAt: Date,
    completedAt: Date,
    pausedAt: Date,
  },
  { timestamps: true },
)

export const EmailCampaign = mongoose.model('EmailCampaign', emailCampaignSchema)
