import mongoose from 'mongoose'

const emailCampaignSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, default: 'Email campaign' },
    subject: { type: String, required: true },
    htmlBody: { type: String, default: '' },
    textBody: { type: String, default: '' },
    // Optional pool of templates — when present, each recipient gets a random one.
    templates: {
      type: [{ subject: String, htmlBody: String, textBody: String }],
      default: [],
    },
    fromEmail: String,
    status: {
      type: String,
      enum: ['draft', 'sending', 'completed', 'failed', 'cancelled'],
      default: 'draft',
    },
    trackOpens: { type: Boolean, default: true },
    batchSize: { type: Number, default: 25 },
    batchDelayMs: { type: Number, default: 3000 },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
    },
    error: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
)

export const EmailCampaign = mongoose.model('EmailCampaign', emailCampaignSchema)
