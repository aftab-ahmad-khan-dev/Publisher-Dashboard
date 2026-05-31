import mongoose from 'mongoose'

/**
 * Temporary public image host for Instagram publishing. IG's API only accepts a
 * public image_url (no upload/base64), so we persist the bytes briefly and serve
 * them from /api/media/:id. Auto-expire after 24h — they're only needed during
 * the publish (and a little longer for scheduled posts firing later).
 */
const mediaSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, index: true },
    contentType: { type: String, default: 'image/jpeg' },
    data: Buffer,
  },
  { timestamps: true },
)

mediaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })

export const Media = mongoose.model('Media', mediaSchema)
