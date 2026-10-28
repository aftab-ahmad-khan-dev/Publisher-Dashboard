import { Router } from 'express'
import { runDuePosts } from '../lib/scheduler.js'

const router = Router()

/** Vercel Cron — set CRON_SECRET in env; Vercel sends Authorization: Bearer <CRON_SECRET> */
router.get('/cron/run-scheduler', async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET?.trim()
    if (secret) {
      const auth = req.headers.authorization || ''
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' })
      }
    }

    await runDuePosts()
    res.json({ ok: true, ranAt: new Date().toISOString() })
  } catch (err) {
    next(err)
  }
})

export default router
