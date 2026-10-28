import { Router } from 'express'
import { subscribeClient, unsubscribeClient } from '../lib/events.js'

const router = Router()

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write(': connected\n\n')
  const client = subscribeClient(res, req.workspaceId)

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n')
  }, 25_000)

  req.on('close', () => {
    clearInterval(heartbeat)
    unsubscribeClient(client)
  })
})

export default router
