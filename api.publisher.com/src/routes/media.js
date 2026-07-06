import { Router } from 'express'
import { Media } from '../models/Media.js'
import { apiPublicBase } from '../lib/publicUrl.js'

const router = Router()

/** One image per request — keeps payloads under Vercel's ~4.5 MB limit. */
router.post('/media/upload', async (req, res, next) => {
  try {
    const { imageDataUrl, contentType, dataBase64 } = req.body || {}

    let buffer
    let ct = contentType || 'image/jpeg'

    if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
      const [meta, b64] = imageDataUrl.split(',')
      ct = /data:(.*?);/.exec(meta)?.[1] || ct
      buffer = Buffer.from(b64 || '', 'base64')
    } else if (typeof dataBase64 === 'string' && dataBase64.length) {
      buffer = Buffer.from(dataBase64, 'base64')
    } else {
      return res.status(400).json({ ok: false, error: 'Provide imageDataUrl or dataBase64.' })
    }

    if (!buffer?.length) {
      return res.status(400).json({ ok: false, error: 'Empty image data.' })
    }

    const MAX_BYTES = 10 * 1024 * 1024
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({
        ok: false,
        error: 'Image still too large after compression. Export smaller from Figma or reduce dimensions.',
      })
    }

    const doc = await Media.create({
      workspaceId: req.workspaceId,
      contentType: ct,
      data: buffer,
    })

    const id = doc._id.toString()
    const url = apiPublicBase() ? `${apiPublicBase()}/api/media/${id}` : null

    res.json({ ok: true, id, url })
  } catch (err) {
    next(err)
  }
})

export default router
