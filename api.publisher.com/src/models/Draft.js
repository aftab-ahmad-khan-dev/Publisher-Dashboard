import mongoose from 'mongoose'

const draftSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    title: String,
    body: String,
    cropHint: String,
    imageVisibility: mongoose.Schema.Types.Mixed,
    hashtags: [mongoose.Schema.Types.Mixed],
    platforms: mongoose.Schema.Types.Mixed,
    publishMode: String,
    scheduledAt: String,
    timezone: String,
    imageMeta: mongoose.Schema.Types.Mixed,
    poll: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
)

draftSchema.index({ workspaceId: 1, clientId: 1 }, { unique: true })

export const Draft = mongoose.model('Draft', draftSchema)
