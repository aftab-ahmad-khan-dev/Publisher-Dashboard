/**
 * Test + send a calendar-booking verification email.
 * Usage: node scripts/test-booking-mail.mjs [to@email.com]
 *
 * Does not require MongoDB — validates rewrite logic, hits the live booking URL,
 * and sends a real SMTP test message you can open on your phone.
 */
import 'dotenv/config'
import crypto from 'crypto'
import {
  isBookingUrl,
  isCalendarBookingIntent,
  getCalendarBookingUrl,
  DEFAULT_CALENDAR_BOOKING_URL,
} from '../src/lib/googleCalendar.js'
import { rewriteLinksForTracking } from '../src/lib/emailWorker.js'
import { forceScheduleMeetingHrefs } from '../src/lib/meetingCta.js'
import { sendMail, isMailerConfigured } from '../src/lib/mailer.js'
import { apiPublicBase } from '../src/lib/publicUrl.js'

const to = process.argv[2] || process.env.FROM_EMAIL || process.env.SMTP_EMAIL
const booking = getCalendarBookingUrl()
const trackingId = `test-${crypto.randomBytes(8).toString('hex')}`
const apiBase = `${apiPublicBase() || 'http://127.0.0.1:3001'}/api/email`

function log(step, data = {}) {
  console.log(`\n[${step}]`, JSON.stringify(data, null, 2))
}

async function main() {
  console.log('=== Calendar booking mail test ===')
  log('config', {
    to,
    booking,
    defaultBooking: DEFAULT_CALENDAR_BOOKING_URL,
    apiBase,
    trackingId,
    smtpReady: isMailerConfigured(),
  })

  const adminBad = 'https://calendar.google.com/calendar/u/0/r/appointment'
  log('validate_urls', {
    publicShort_ok: isBookingUrl(booking),
    adminPage_rejected: isBookingUrl(adminBad) === false,
    admin_is_calendar_intent: isCalendarBookingIntent(adminBad),
  })

  let html = `
    <p>Hi — this is a booking-link verification from Publisher Dashboard.</p>
    <p><a href="https://vorkspro.com">Visit VorksPro</a></p>
    <p><a href="${adminBad}">Schedule a meeting</a></p>
  `
  html = forceScheduleMeetingHrefs(html, booking)
  html = rewriteLinksForTracking(html, `${apiBase}/click`, trackingId, booking)
  log('html_after_rewrite', { html: html.replace(/\s+/g, ' ').trim() })

  const meetingHref =
    html.match(/href="([^"]*\/meeting)"/)?.[1] ||
    html.match(/href='([^']*\/meeting)'/)?.[1] ||
    ''
  const hasMeetingPath = /\/click\/[^"'/]+\/meeting/.test(html)
  const stillHasAdmin = html.includes('/r/appointment')
  log('rewrite_checks', {
    hasMeetingPath,
    meetingHref,
    adminHrefRemoved: !stillHasAdmin,
    ok: hasMeetingPath && !stillHasAdmin,
  })

  // Live booking URL (follow redirects)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  let live = { ok: false }
  try {
    const res = await fetch(booking, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
      },
    })
    live = {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      finalUrl: res.url,
      looksLikeSchedule:
        /appointments\/schedules\//i.test(res.url) || /calendar\.app\.google/i.test(res.url),
    }
  } catch (err) {
    live = { ok: false, error: err.message }
  } finally {
    clearTimeout(timer)
  }
  log('live_booking_fetch', live)

  // Probe production click endpoints (may 404 until API deploy)
  for (const path of [
    `/click/${trackingId}/meeting`,
    `/click/${trackingId}?u=${encodeURIComponent(adminBad)}`,
  ]) {
    const url = `${apiBase}${path}`
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'manual' })
      const loc = res.headers.get('location') || ''
      log('prod_click_probe', {
        path,
        status: res.status,
        location: loc,
        note:
          path.includes('/meeting') && res.status === 404
            ? 'Deploy API with /meeting route before tracked clicks work in prod'
            : undefined,
      })
    } catch (err) {
      log('prod_click_probe', { path, error: err.message })
    }
  }

  if (!to) throw new Error('No recipient email — pass one as argv or set FROM_EMAIL')
  if (!isMailerConfigured()) throw new Error('SMTP not configured in .env')

  const text = [
    'Publisher Dashboard — calendar booking test',
    '',
    `Public booking link (open this): ${booking}`,
    meetingHref ? `Tracked meeting path (after API deploy): ${meetingHref}` : '',
    '',
    'Expected: Google shows available slots.',
    'Broken: “There was an error loading this appointment page”.',
  ]
    .filter(Boolean)
    .join('\n')

  const mailHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0b1220;">
      <h2 style="margin:0 0 12px;">Calendar booking test</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">
        Sent by Publisher Dashboard. Tap the button on your phone and confirm Google shows slots (not an error page).
      </p>
      <p style="margin:0 0 20px;">
        <a href="${booking}" style="display:inline-block;padding:12px 18px;background:#0f3d68;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">
          Schedule a meeting
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;margin:0 0 8px;">Direct public link:</p>
      <p style="font-size:12px;word-break:break-all;"><a href="${booking}">${booking}</a></p>
      ${
        meetingHref
          ? `<p style="font-size:12px;color:#64748b;margin:16px 0 8px;">Tracked click (needs API deploy):</p>
             <p style="font-size:12px;word-break:break-all;"><a href="${meetingHref}">${meetingHref}</a></p>`
          : ''
      }
      <hr style="border:none;border-top:1px solid #e5eaf0;margin:20px 0;" />
      <p style="font-size:11px;color:#94a3b8;margin:0;">Tracking id: ${trackingId}</p>
    </div>
  `

  const result = await sendMail({
    to,
    subject: `[TEST] Calendar booking link check — ${new Date().toISOString().slice(0, 16)}`,
    text,
    html: mailHtml,
  })
  log('mail_sent', { to, messageId: result.messageId })

  const summary = {
    ok: hasMeetingPath && !stillHasAdmin && live.ok !== false,
    to,
    booking,
    meetingHref,
    messageId: result.messageId,
    next: 'Open the email → tap Schedule a meeting → confirm slots load.',
  }
  console.log('\n=== SUMMARY ===')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message)
  process.exit(1)
})
