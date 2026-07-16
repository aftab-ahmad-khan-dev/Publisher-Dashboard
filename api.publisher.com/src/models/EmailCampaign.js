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
    /** Legacy batch controls — superseded by cooldownMs for paced outreach */
    batchSize: { type: Number, default: 1 },
    batchDelayMs: { type: Number, default: 480000 },
    /** Minutes between individual sends (bulk). Default 8 min. */
    cooldownMs: { type: Number, default: 8 * 60 * 1000 },
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
