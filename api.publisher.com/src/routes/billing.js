import { Router } from 'express'
import { PaymentSubmission } from '../models/PaymentSubmission.js'
import { BANK_DETAILS, PLAN_PRICES } from '../lib/plans.js'
import {
  getBillingMe,
  getOrCreateSubscription,
  isAdminEmail,
  resolveRequestEmail,
} from '../lib/subscription.js'
import { sendMail, isMailerConfigured } from '../lib/mailer.js'
import { logger } from '../lib/logger.js'
import { apiPublicBase } from '../lib/publicUrl.js'
import {
  isCloudinaryConfigured,
  parseImageBody,
  uploadReceiptToCloudinary,
} from '../lib/cloudinary.js'
import { requirePlatformAdmin } from '../middleware/admin.js'

const router = Router()

export function formatPlanPrice(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return String(amount ?? '')
  return n.toFixed(2)
}

function planLabel(plan) {
  const price = PLAN_PRICES[plan]
  const names = { starter: 'Starter', growth: 'Growth', pro: 'Pro' }
  return `${names[plan] || plan}${price != null ? ` ($${formatPlanPrice(price)}/mo)` : ''}`
}

async function sendSafeMail(payload) {
  if (!isMailerConfigured()) {
    logger.warn('SMTP not configured — skipped billing email', { to: payload.to })
    return { skipped: true }
  }
  try {
    await sendMail(payload)
    return { ok: true }
  } catch (err) {
    logger.error('Billing email failed', { error: err.message, to: payload.to })
    return { ok: false, error: err.message }
  }
}

router.get('/billing/me', async (req, res, next) => {
  try {
    if (!req.workspaceId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }
    const me = await getBillingMe(req)
    res.json({ ok: true, ...me, prices: PLAN_PRICES })
  } catch (err) {
    next(err)
  }
})

router.get('/billing/banks', async (_req, res) => {
  res.json({ ok: true, banks: BANK_DETAILS, prices: PLAN_PRICES })
})

/** Upload payment receipt to Cloudinary (falls back to API media if Cloudinary unset). */
router.post('/billing/receipt', async (req, res, next) => {
  try {
    if (!req.workspaceId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }
    const email = await resolveRequestEmail(req)
    if (isAdminEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: 'Admin accounts have full access — no payment receipt needed.',
      })
    }

    const { buffer, contentType } = parseImageBody(req.body)
    if (!buffer?.length) {
      return res.status(400).json({ ok: false, error: 'Provide imageDataUrl or dataBase64.' })
    }
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'Receipt image is too large (max 8MB).' })
    }

    if (isCloudinaryConfigured()) {
      const uploaded = await uploadReceiptToCloudinary({ buffer, contentType })
      return res.json({ ok: true, id: uploaded.id, url: uploaded.url, provider: 'cloudinary' })
    }

    // Fallback: store in Media collection
    const { Media } = await import('../models/Media.js')
    const doc = await Media.create({
      workspaceId: req.workspaceId,
      contentType,
      data: buffer,
    })
    const id = doc._id.toString()
    const url = apiPublicBase() ? `${apiPublicBase()}/api/media/${id}` : null
    res.json({ ok: true, id, url, provider: 'media' })
  } catch (err) {
    next(err)
  }
})

router.get('/billing/payments', async (req, res, next) => {
  try {
    const email = await resolveRequestEmail(req)
    if (isAdminEmail(email)) {
      // Admin sees every user's receipts here (activate from Billing or Admin → Users).
      const rows = await PaymentSubmission.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
      return res.json({
        ok: true,
        isAdmin: true,
        payments: rows.map((p) => ({
          id: p._id.toString(),
          workspaceId: p.workspaceId,
          userEmail: p.userEmail,
          planRequested: p.planRequested,
          bankMethod: p.bankMethod,
          receiptUrl: p.receiptUrl,
          status: p.status,
          note: p.note,
          createdAt: p.createdAt,
          reviewedAt: p.reviewedAt,
        })),
      })
    }

    const rows = await PaymentSubmission.find({ workspaceId: req.workspaceId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
    res.json({
      ok: true,
      isAdmin: false,
      payments: rows.map((p) => ({
        id: p._id.toString(),
        planRequested: p.planRequested,
        bankMethod: p.bankMethod,
        receiptUrl: p.receiptUrl,
        status: p.status,
        note: p.note,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
      })),
    })
  } catch (err) {
    next(err)
  }
})

/** Admin can activate/reject from Billing without going to Admin Users. */
router.post('/billing/payments/:id/activate', requirePlatformAdmin, async (req, res, next) => {
  try {
    const payment = await PaymentSubmission.findById(req.params.id)
    if (!payment) {
      return res.status(404).json({ ok: false, error: 'Payment not found' })
    }

    payment.status = 'approved'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.adminUser?.email || ''
    payment.rejectReason = ''
    await payment.save()

    const sub = await getOrCreateSubscription(payment.workspaceId, payment.userEmail)
    sub.plan = payment.planRequested
    sub.status = 'active'
    sub.activatedAt = new Date()
    sub.activatedBy = req.adminUser?.email || ''
    if (payment.userEmail) sub.userEmail = payment.userEmail
    await sub.save()

    if (payment.userEmail) {
      await sendSafeMail({
        to: payment.userEmail,
        subject: 'Welcome onboard — your plan is active',
        text: [
          `Welcome onboard!`,
          '',
          `Your ${planLabel(payment.planRequested)} plan is now active.`,
          'You can open Publisher Suite and start using your unlocked features.',
          '',
          '— Publisher Suite',
        ].join('\n'),
        html: `
          <p><strong>Welcome onboard!</strong></p>
          <p>Your <strong>${planLabel(payment.planRequested)}</strong> plan is now active.</p>
          <p>You can open Publisher Suite and start using your unlocked features.</p>
          <p>— Publisher Suite</p>
        `,
      })
    }

    res.json({
      ok: true,
      payment: {
        id: payment._id.toString(),
        status: payment.status,
        planRequested: payment.planRequested,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/billing/payments/:id/reject', requirePlatformAdmin, async (req, res, next) => {
  try {
    const payment = await PaymentSubmission.findById(req.params.id)
    if (!payment) {
      return res.status(404).json({ ok: false, error: 'Payment not found' })
    }
    const reason = String(req.body?.reason || '').slice(0, 500)
    payment.status = 'rejected'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.adminUser?.email || ''
    payment.rejectReason = reason
    await payment.save()

    if (payment.userEmail) {
      await sendSafeMail({
        to: payment.userEmail,
        subject: 'Payment receipt needs attention',
        text: [
          'We could not activate your plan from the submitted receipt.',
          reason ? `Reason: ${reason}` : 'Please re-upload a clearer receipt from Billing.',
          '',
          '— Publisher Suite',
        ].join('\n'),
      })
    }

    res.json({
      ok: true,
      payment: { id: payment._id.toString(), status: payment.status },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/billing/submit', async (req, res, next) => {
  try {
    if (!req.workspaceId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    const email = await resolveRequestEmail(req)
    if (isAdminEmail(email)) {
      return res.json({
        ok: true,
        skipped: true,
        message: 'Admin accounts have full access — no payment needed.',
      })
    }

    const { planRequested, bankMethod, receiptMediaId, receiptUrl, note } = req.body || {}
    if (!['starter', 'growth', 'pro'].includes(planRequested)) {
      return res.status(400).json({ ok: false, error: 'Choose a valid plan (starter, growth, or pro).' })
    }
    if (!['jazzcash', 'ubl', 'nayapay', 'meezan'].includes(bankMethod)) {
      return res.status(400).json({ ok: false, error: 'Choose a valid bank / wallet.' })
    }

    const mediaId = String(receiptMediaId || '').trim()
    let url = String(receiptUrl || '').trim()
    if (!mediaId && !url) {
      return res.status(400).json({ ok: false, error: 'Upload a payment receipt first.' })
    }
    if (mediaId && !url && apiPublicBase()) {
      url = `${apiPublicBase()}/api/media/${mediaId}`
    }

    const payment = await PaymentSubmission.create({
      workspaceId: req.workspaceId,
      userEmail: email,
      planRequested,
      bankMethod,
      receiptMediaId: mediaId,
      receiptUrl: url,
      note: String(note || '').slice(0, 500),
      status: 'pending',
    })

    const sub = await getOrCreateSubscription(req.workspaceId, email)
    sub.status = 'pending'
    sub.userEmail = email || sub.userEmail
    await sub.save()

    if (email) {
      await sendSafeMail({
        to: email,
        subject: 'Payment received — we are reviewing your receipt',
        text: [
          `Thanks for submitting payment for ${planLabel(planRequested)}.`,
          '',
          'We received your receipt and will confirm once your plan is activated.',
          'You will get another email when access is unlocked.',
          '',
          '— Publisher Suite',
        ].join('\n'),
        html: `
          <p>Thanks for submitting payment for <strong>${planLabel(planRequested)}</strong>.</p>
          <p>We received your receipt and will confirm once your plan is activated.</p>
          <p>You will get another email when access is unlocked.</p>
          <p>— Publisher Suite</p>
        `,
      })
    }

    const adminNotify = process.env.ADMIN_EMAIL?.trim() || 'aftabahmadkhan.dev@gmail.com'
    await sendSafeMail({
      to: adminNotify,
      subject: `New payment receipt — ${planLabel(planRequested)}`,
      text: `User ${email || req.workspaceId} submitted ${planRequested} via ${bankMethod}. Review in Admin → Payments.`,
    })

    res.json({
      ok: true,
      payment: {
        id: payment._id.toString(),
        planRequested: payment.planRequested,
        bankMethod: payment.bankMethod,
        status: payment.status,
        receiptUrl: payment.receiptUrl,
      },
      message: 'Thank you! Confirmation email is on the way. We will activate your plan after review.',
    })
  } catch (err) {
    next(err)
  }
})

export default router
