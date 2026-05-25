import { Router } from 'express'
import { startLinkedInAuth, handleLinkedInCallback } from '../lib/linkedinOAuth.js'
import { startGmailAuth, handleGmailCallback, getGmailOAuthSetup } from '../lib/gmailOAuth.js'
import { getWorkspaceConfig } from '../lib/configStore.js'

const router = Router()
const WEB_URL = process.env.WEB_URL?.trim() || 'http://localhost:5173'

router.get('/auth/linkedin', async (req, res, next) => {
  try {
    const url = await startLinkedInAuth(req.workspaceId)
    res.redirect(url)
  } catch (err) {
    next(err)
  }
})

router.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description: desc } = req.query
  const redirect = (params) => {
    const q = new URLSearchParams(params).toString()
    res.redirect(`${WEB_URL}/api-config?${q}`)
  }

  if (error) {
    return redirect({ linkedin: 'error', message: desc || error })
  }

  try {
    await handleLinkedInCallback(code, state)
    redirect({ linkedin: 'connected' })
  } catch (err) {
    redirect({ linkedin: 'error', message: err.message })
  }
})

router.get('/auth/gmail/setup', async (req, res, next) => {
  try {
    const config = await getWorkspaceConfig(req.workspaceId)
    res.json({ ok: true, ...getGmailOAuthSetup(config) })
  } catch (err) {
    next(err)
  }
})

router.get('/auth/gmail', async (req, res, next) => {
  try {
    const url = await startGmailAuth(req.workspaceId)
    res.redirect(url)
  } catch (err) {
    next(err)
  }
})

router.get('/auth/gmail/callback', async (req, res) => {
  const { code, state, error } = req.query
  const redirect = (params) => {
    const q = new URLSearchParams(params).toString()
    res.redirect(`${WEB_URL}/api-config?${q}`)
  }

  if (error) {
    return redirect({ gmail: 'error', message: error })
  }

  try {
    await handleGmailCallback(code, state)
    redirect({ gmail: 'connected' })
  } catch (err) {
    redirect({ gmail: 'error', message: err.message })
  }
})

export default router
