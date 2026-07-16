/**
 * HTML email templates (inline CSS — email-safe, Tailwind-inspired).
 * Served to the Mail Box UI and used when sending.
 */
import { getCalendarBookingUrl, isBookingUrl } from './googleCalendar.js'
import { forceScheduleMeetingHrefs } from './meetingCta.js'

export const SIGNATURE = {
  name: 'Aftab Ahmad Khan',
  role: 'Solo Full-Stack Developer · MERN · Shopify · AI',
  site: 'https://aftabahmadkhan.online',
  email: 'aftabahmadkhan.dev@gmail.com',
  product: 'https://vorkspro.com',
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtmlParagraphs(text) {
  return String(text || '')
    .split(/\n\n+/)
    .map((block) => {
      const inner = escapeHtml(block).replace(/\n/g, '<br>\n')
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${inner}</p>`
    })
    .join('\n')
}

function layout({
  preheader,
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  secondaryCta,
  footerNote,
}) {
  const buttons = []
  if (ctaLabel && ctaUrl) {
    buttons.push({ label: ctaLabel, url: ctaUrl })
  }
  if (secondaryCta?.label && secondaryCta?.url) {
    buttons.push({ label: secondaryCta.label, url: secondaryCta.url })
  }

  const ctaBlock =
    buttons.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
          <tr>
            ${buttons
              .map((btn, i) => {
                const isMeeting =
                  btn.url === '{{meetingLink}}' ||
                  /calendar\.google\.com|calendar\.app\.google|appointments/i.test(
                    String(btn.url || ''),
                  ) ||
                  /schedule|meeting|book|pick a time/i.test(String(btn.label || ''))
                const bg = isMeeting ? '#4f46e5' : i === 0 ? '#0f172a' : '#4f46e5'
                return `<td style="padding-right:${i < buttons.length - 1 ? '10' : '0'}px;padding-bottom:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:${bg};">
                    <a href="${escapeHtml(btn.url)}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
                      ${escapeHtml(btn.label)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>`
              })
              .join('')}
          </tr>
        </table>
        ${
          buttons.some(
            (b) =>
              /schedule|meeting|book|pick a time/i.test(b.label) ||
              /calendar\.|appointments/i.test(b.url) ||
              b.url === '{{meetingLink}}',
          )
            ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.45;color:#64748b;font-family:ui-sans-serif,system-ui,sans-serif;">Schedule opens my Google Calendar — pick a time that works for you. Only available slots are shown.</p>`
            : ''
        }`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:20px 28px;background:linear-gradient(135deg,#0f172a,#1e293b);">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#a5b4fc;text-transform:uppercase;">
                ${escapeHtml(SIGNATURE.name)}
              </p>
              <p style="margin:6px 0 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#94a3b8;">
                ${escapeHtml(SIGNATURE.role)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
              ${bodyHtml}
              ${ctaBlock}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                <strong style="color:#0f172a;">${escapeHtml(SIGNATURE.name)}</strong><br/>
                ${escapeHtml(SIGNATURE.role)}<br/>
                <a href="${escapeHtml(SIGNATURE.site)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(SIGNATURE.site.replace(/^https?:\/\//, ''))}</a>
                · <a href="mailto:${escapeHtml(SIGNATURE.email)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(SIGNATURE.email)}</a>
              </p>
              ${
                footerNote
                  ? `<p style="margin:12px 0 0;font-size:11px;line-height:1.45;color:#94a3b8;">${escapeHtml(footerNote)}</p>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const OUTREACH_BODIES = {
  'outreach-direct': {
    name: 'Direct hire',
    subject: '{{firstName}}, production software without the agency overhead',
    text: `{{greeting}},

I help founders ship production MERN, Shopify, SaaS, and AI products end-to-end — solo, no outsourcing.

{{fomoLine}}. If {{company}} needs a senior builder who owns scope, milestones, and handoff, I may be a fit.

Portfolio & proof: https://aftabahmadkhan.online
(97+ projects · 5.0 feedback · clients in 14+ countries)

If you prefer to start the contract on Fiverr or Upwork, that works for me too — happy to meet you where your process already is.

Worth a short reply? Or schedule a quick call on my calendar.`,
    ctaLabel: 'View portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: {
      label: 'Schedule a meeting',
      url: '{{meetingLink}}',
    },
    footerNote: 'Happy to work via Fiverr or Upwork if that is how you prefer to start.',
  },
  'outreach-ceo': {
    name: 'CEO / founder',
    subject: 'For {{designation}} at {{company}} — senior delivery, direct hire',
    text: `{{greeting}},

Most {{industry}} teams I talk to in {{country}} don't need another agency slide deck. They need someone who ships.

I'm Aftab — solo full-stack (MERN, Shopify, AI automation). {{fomoLine}}.

Happy to share a short case study relevant to {{company}}. If contracting via Fiverr/Upwork is easier on your side, I'm fine with that as well.

Prefer a quick call? Grab a slot on my calendar.`,
    ctaLabel: 'See work & reviews',
    ctaUrl: SIGNATURE.site,
    secondaryCta: {
      label: 'Schedule a meeting',
      url: '{{meetingLink}}',
    },
    footerNote: 'Fiverr / Upwork contracts are fine if that fits your process.',
  },
  'outreach-fomo': {
    name: 'Region FOMO',
    subject: '{{city}} / {{country}} teams are tightening their build stack',
    text: `{{greeting}},

{{fomoLine}} — especially around MERN SaaS, Shopify ops, and AI workflows.

I partner directly with founders (no junior handoff). Details: https://aftabahmadkhan.online

Open to a quick reply if {{company}} is evaluating a build or rebuild — or schedule a short call.`,
    ctaLabel: 'Open portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: {
      label: 'Schedule a meeting',
      url: '{{meetingLink}}',
    },
    footerNote: 'Fiverr / Upwork starts are welcome.',
  },
}

const PRODUCT_BODIES = {
  'product-intro': {
    name: 'VorksPro intro',
    subject: '{{company}} — a faster ops stack with VorksPro',
    text: `{{greeting}},

{{fomoLine}}. I built VorksPro to help teams cut the busywork between tools and get publishing + outreach under control.

Product: https://vorkspro.com

If it looks relevant for {{company}}, pick a time on my calendar that works for you — availability is live.`,
    ctaLabel: 'Schedule a meeting',
    ctaUrl: '{{meetingLink}}',
    secondaryCta: { label: 'Visit VorksPro', url: SIGNATURE.product },
  },
  'product-meeting': {
    name: 'Book a demo',
    subject: '15 min on VorksPro for {{company}}?',
    text: `{{greeting}},

Quick context: VorksPro helps {{industry}} teams in {{region}} ship and follow up without tab chaos.

See it here: https://vorkspro.com

Choose a slot on my Google Calendar — you'll only see times I'm free.`,
    ctaLabel: 'Schedule a meeting — pick a time',
    ctaUrl: '{{meetingLink}}',
    secondaryCta: { label: 'Visit VorksPro', url: SIGNATURE.product },
  },
  'product-fomo': {
    name: 'Region + product',
    subject: '{{country}} teams are booking VorksPro walkthroughs',
    text: `{{greeting}},

{{fomoLine}}. VorksPro is the product I use with founders who want outreach + publishing in one place.

https://vorkspro.com

Book a walkthrough when it suits you — the link shows my live availability.`,
    ctaLabel: 'Schedule a meeting',
    ctaUrl: '{{meetingLink}}',
    secondaryCta: { label: 'Visit VorksPro', url: SIGNATURE.product },
  },
}

function resolveCtaUrl(url, _meetingLink) {
  // Keep the merge tag in source defs; buildTemplate substitutes a validated booking URL.
  if (url === '{{meetingLink}}') return '{{meetingLink}}'
  return url
}

function buildTemplate(id, type, def, meetingLink) {
  const booking =
    meetingLink && isBookingUrl(meetingLink) ? meetingLink : getCalendarBookingUrl(meetingLink)
  const rawCta = resolveCtaUrl(def.ctaUrl, booking)
  const ctaUrl = rawCta === '{{meetingLink}}' ? booking : rawCta
  const secondaryCta = def.secondaryCta
    ? {
        label: def.secondaryCta.label,
        url: (() => {
          const raw = resolveCtaUrl(def.secondaryCta.url, booking)
          return raw === '{{meetingLink}}' ? booking : raw
        })(),
      }
    : undefined
  let htmlBody = layout({
    preheader: def.subject,
    title: def.name,
    bodyHtml: textToHtmlParagraphs(def.text),
    ctaLabel: def.ctaLabel,
    ctaUrl,
    secondaryCta,
    footerNote: def.footerNote,
  })
  // Hard guarantee: any Schedule-labeled button uses the calendar booking URL.
  htmlBody = forceScheduleMeetingHrefs(htmlBody, booking)
  const textBody = String(def.text || '').replaceAll('{{meetingLink}}', booking)
  return {
    id,
    name: def.name,
    type,
    subject: def.subject,
    textBody,
    htmlBody,
    previewText: textBody.slice(0, 140),
    ctaLabel: def.ctaLabel,
    secondaryCtaLabel: def.secondaryCta?.label || '',
    meetingLink: booking,
  }
}

export function listEmailHtmlTemplates(meetingLink) {
  const link =
    meetingLink && isBookingUrl(meetingLink) ? meetingLink : getCalendarBookingUrl(meetingLink)
  return [
    ...Object.entries(OUTREACH_BODIES).map(([id, def]) =>
      buildTemplate(id, 'outreach', def, link),
    ),
    ...Object.entries(PRODUCT_BODIES).map(([id, def]) =>
      buildTemplate(id, 'product', def, link),
    ),
  ]
}

export function getEmailHtmlTemplate(id, meetingLink) {
  return listEmailHtmlTemplates(meetingLink).find((t) => t.id === id) || null
}

export function templatesByType(type, meetingLink) {
  return listEmailHtmlTemplates(meetingLink).filter((t) =>
    type === 'product' || type === 'outreach' ? t.type === type : true,
  )
}
