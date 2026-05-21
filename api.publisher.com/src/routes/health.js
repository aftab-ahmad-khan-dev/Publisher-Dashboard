import { Router } from 'express'
import { collectHealthStatus } from '../lib/healthStatus.js'
import { renderHealthPage } from '../views/healthPage.js'

const router = Router()

async function healthPageHandler(_req, res) {
  const status = await collectHealthStatus()
  res.status(status.ok ? 200 : 503)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(renderHealthPage(status))
}

router.get('/', healthPageHandler)
router.get('/health', healthPageHandler)

export default router
