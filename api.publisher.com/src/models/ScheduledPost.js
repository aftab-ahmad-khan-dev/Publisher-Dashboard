import mongoose from 'mongoose'

const scheduledPostSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    body: { type: String, required: true },
    platforms: [String],
    scheduledAt: { type: Date, required: true, index: true },
    timezone: String,
    status: {
      type: String,
      enum: ['scheduled', 'publishing', 'published', 'failed', 'cancelled'],
      default: 'scheduled',
    },
    postState: mongoose.Schema.Types.Mixed,
    platformResults: mongoose.Schema.Types.Mixed,
    error: String,
  },
  { timestamps: true },
)

export const ScheduledPost = mongoose.model('ScheduledPost', scheduledPostSchema)
