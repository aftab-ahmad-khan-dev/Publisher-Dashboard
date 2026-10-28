import mongoose from 'mongoose'

/**
 * Image bytes for publishing. Scheduled posts also keep a compressed imageDataUrl
 * in postState so images survive if this record is removed; Media is a cache for
 * public /api/media/:id URLs during publish.
 */
const mediaSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, index: true },
    contentType: { type: String, default: 'image/jpeg' },
    data: Buffer,
  },
  { timestamps: true },
)

export const Media = mongoose.model('Media', mediaSchema)
