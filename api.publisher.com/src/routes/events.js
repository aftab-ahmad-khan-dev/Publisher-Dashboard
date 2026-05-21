import { Router } from 'express'
import { subscribeClient, unsubscribeClient } from '../lib/events.js'

const router = Router()

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write(': connected\n\n')
  subscribeClient(res)

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n')
  }, 25_000)

  req.on('close', () => {
    clearInterval(heartbeat)
    unsubscribeClient(res)
  })
})

export default router
