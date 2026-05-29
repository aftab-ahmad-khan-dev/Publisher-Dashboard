import nodemailer from 'nodemailer'
import { logger } from './logger.js'

let transporter = null

/** Lazily build a singleton SMTP transport from env. Returns null if unconfigured. */
function getTransport() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_EMAIL?.trim()
  const pass = process.env.SMTP_PASSWORD?.trim()
  if (!host || !user || !pass) return null

  const port = Number(process.env.SMTP_PORT) || 587
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user, pass },
  })
  return transporter
}

export function isMailerConfigured() {
  return Boolean(getTransport())
}

/**
 * Send a transactional email over SMTP.
 * @param {{ to: string, subject: string, text?: string, html?: string }} message
 */
export async function sendMail({ to, subject, text, html }) {
  const tx = getTransport()
  if (!tx) throw new Error('SMTP not configured (set SMTP_HOST / SMTP_EMAIL / SMTP_PASSWORD)')

  const from = process.env.FROM_EMAIL?.trim() || process.env.SMTP_EMAIL?.trim()
  const info = await tx.sendMail({ from, to, subject, text, html })
  logger.success('Email sent via SMTP', { to, subject: subject?.slice(0, 48) })
  return { messageId: info.messageId }
}
