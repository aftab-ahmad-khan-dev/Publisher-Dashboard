import mongoose from 'mongoose'

// Per-workspace autosaved email composer draft (subject + body).
const emailTemplateDraftSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true, index: true },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
  },
  { timestamps: true },
)

export const EmailTemplateDraft = mongoose.model('EmailTemplateDraft', emailTemplateDraftSchema)
