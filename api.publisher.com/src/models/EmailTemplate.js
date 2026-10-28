import mongoose from 'mongoose'

/**
 * Per-workspace email templates for bulk and single sends.
 * `category` is user-defined (e.g. CEO/CTO, Direct, Founder).
 */
const emailTemplateSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80, default: 'General' },
    subject: { type: String, required: true, trim: true, maxlength: 500 },
    body: { type: String, required: true, maxlength: 50000 },
    htmlBody: { type: String, default: '', maxlength: 100000 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
)

emailTemplateSchema.index({ workspaceId: 1, category: 1, name: 1 })
emailTemplateSchema.index({ workspaceId: 1, updatedAt: -1 })

export const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema)
