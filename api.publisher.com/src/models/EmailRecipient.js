import mongoose from 'mongoose'

const emailRecipientSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', required: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    company: { type: String, default: '' },
    niche: { type: String, default: '' },
    mergeData: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'failed', 'opened'],
      default: 'queued',
    },
    trackingId: { type: String, index: true },
    gmailMessageId: String,
    // The actual personalized content sent to this recipient (merge tags filled,
    // spintax resolved). Captured at send time so it can be viewed afterward.
    renderedSubject: String,
    renderedText: String,
    renderedHtml: String,
    error: String,
    sentAt: Date,
    openedAt: Date,
    openCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

emailRecipientSchema.index({ campaignId: 1, email: 1 })

export const EmailRecipient = mongoose.model('EmailRecipient', emailRecipientSchema)
