import mongoose from 'mongoose'

const publishedPostSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    body: { type: String, required: true },
    platforms: [String],
    publishedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'published' },
    platformResults: mongoose.Schema.Types.Mixed,
    source: { type: String, enum: ['immediate', 'scheduled'], default: 'immediate' },
    scheduledPostId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
)

export const PublishedPost = mongoose.model('PublishedPost', publishedPostSchema)
