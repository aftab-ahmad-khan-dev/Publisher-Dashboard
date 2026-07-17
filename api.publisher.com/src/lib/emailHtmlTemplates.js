/**
 * HTML email templates — clean, executive, email-safe inline CSS.
 * Served to the Mail Box UI and used when sending.
 */
import { getCalendarBookingUrl, isBookingUrl } from './googleCalendar.js'
import { forceScheduleMeetingHrefs } from './meetingCta.js'

export const SIGNATURE = {
  name: 'Aftab Ahmad Khan',
  role: 'Product Engineer · Web · Mobile · Desktop · AI',
  headline: 'Full-stack web, native mobile, and desktop apps',
  site: 'https://aftabahmadkhan.online',
  email: 'aftabahmadkhan.dev@gmail.com',
  product: 'https://vorkspro.com',
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

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
      const trimmed = block.trim()
      if (!trimmed) return ''

      // Offer block markers (any order; renderOfferBlock places value → trust → stack)
      // ::pain::…  ::solve::…  ::ease::…  ::benefit::…  ::trust::…  ::offer::cap|cap
      if (
        /^(?:::offer::|::caps::|::trust::|::pain::|::solve::|::ease::|::benefit::)/m.test(
          trimmed,
        )
      ) {
        const normalized = trimmed.startsWith('::caps::')
          ? `::offer::${trimmed.replace(/^::caps::\s*/, '')}`
          : trimmed
        return renderOfferBlock(normalized)
      }

      const inner = escapeHtml(trimmed).replace(/\n/g, '<br>\n')
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1e293b;font-weight:400;font-family:${FONT};">${inner}</p>`
    })
    .join('\n')
}

function parseOfferLines(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  const out = { caps: [], pain: '', solve: '', ease: '', benefit: '', trust: '' }
  for (const line of lines) {
    if (line.startsWith('::offer::') || line.startsWith('::caps::')) {
      out.caps = line
        .replace(/^::(offer|caps)::\s*/, '')
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
    } else if (line.startsWith('::pain::')) out.pain = line.replace(/^::pain::\s*/, '')
    else if (line.startsWith('::solve::')) out.solve = line.replace(/^::solve::\s*/, '')
    else if (line.startsWith('::ease::')) out.ease = line.replace(/^::ease::\s*/, '')
    else if (line.startsWith('::benefit::')) out.benefit = line.replace(/^::benefit::\s*/, '')
    else if (line.startsWith('::trust::')) out.trust = line.replace(/^::trust::\s*/, '')
  }
  return out
}

function renderOfferBlock(block) {
  const { caps, pain, solve, ease, benefit, trust } = parseOfferLines(block)

  const trustLine = trust
    ? `<p style="margin:0 0 14px;padding:12px 14px;font-size:13px;line-height:1.5;color:#0b1220;background:linear-gradient(135deg,#e8f1ff 0%,#f0f7ff 100%);border:1px solid #b6d0f0;border-radius:10px;font-family:${FONT};font-weight:700;">${escapeHtml(trust)}</p>`
    : ''

  const rows = [
    pain && { label: 'The problem', text: pain, accent: '#9f1239' },
    solve && { label: 'The solution', text: solve, accent: '#0f3d68' },
    ease && { label: 'How easy it is', text: ease, accent: '#115e59' },
    benefit && { label: 'What you get', text: benefit, accent: '#1e3a5f' },
  ].filter(Boolean)

  const detailRows = rows
    .map(
      (r) => `<tr>
        <td style="padding:0 0 12px;font-family:${FONT};">
          <p style="margin:0 0 3px;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${r.accent};">${escapeHtml(r.label)}</p>
          <p style="margin:0;font-size:14px;line-height:1.55;color:#0f172a;font-weight:500;">${escapeHtml(r.text)}</p>
        </td>
      </tr>`,
    )
    .join('')

  // Tech stack badges last — 2-per-row for prominence in email clients
  let badgeRows = ''
  if (caps.length) {
    const pairs = []
    for (let i = 0; i < caps.length; i += 2) {
      pairs.push(caps.slice(i, i + 2))
    }
    badgeRows = pairs
      .map((pair) => {
        const cells = pair
          .map(
            (c) => `<td width="50%" style="padding:0 6px 8px 0;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" style="padding:13px 10px;background:#0b1220;border-radius:10px;">
                <span style="display:block;font-size:13px;line-height:1.35;font-weight:800;color:#ffffff;font-family:${FONT};">${escapeHtml(c)}</span>
              </td>
            </tr>
          </table>
        </td>`,
          )
          .join('')
        const pad =
          pair.length === 1
            ? `<td width="50%" style="padding:0 0 8px 0;">&nbsp;</td>`
            : ''
        return `<tr>${cells}${pad}</tr>`
      })
      .join('')
  }

  const stackBlock = caps.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 0;">
        <tr>
          <td style="padding:0 0 10px;font-family:${FONT};">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Tech stack</p>
          </td>
        </tr>
        ${badgeRows}
      </table>`
    : ''

  // Order: value props → trust → tech stack (at the end)
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 24px;background:#ffffff;border:1px solid #d8dee6;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="height:4px;background:#0b1220;font-size:0;line-height:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:18px 16px 16px;font-family:${FONT};">
        ${detailRows ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 14px;">${detailRows}</table>` : ''}
        ${trustLine}
        ${stackBlock}
      </td>
    </tr>
  </table>`
}

function btnCell(label, url, variant, padRight) {
  const bg = variant === 'primary' ? '#0b1220' : variant === 'meeting' ? '#0f3d68' : '#334155'
  return `<td style="padding-right:${padRight}px;padding-bottom:10px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${bg};">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;font-size:13px;font-weight:600;letter-spacing:0.02em;color:#ffffff;text-decoration:none;font-family:${FONT};">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  </td>`
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
  if (ctaLabel && ctaUrl) buttons.push({ label: ctaLabel, url: ctaUrl })
  if (secondaryCta?.label && secondaryCta?.url) {
    buttons.push({ label: secondaryCta.label, url: secondaryCta.url })
  }

  const isMeetingBtn = (btn) =>
    btn.url === '{{meetingLink}}' ||
    /calendar\.google\.com|calendar\.app\.google|appointments/i.test(String(btn.url || '')) ||
    /schedule|meeting|book|pick a time/i.test(String(btn.label || ''))

  const ctaBlock =
    buttons.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
          <tr>
            ${buttons
              .map((btn, i) => {
                const variant = isMeetingBtn(btn) ? 'meeting' : i === 0 ? 'primary' : 'secondary'
                return btnCell(btn.label, btn.url, variant, i < buttons.length - 1 ? 10 : 0)
              })
              .join('')}
          </tr>
        </table>
        ${
          buttons.some(isMeetingBtn)
            ? `<p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#64748b;font-family:${FONT};">Choose any day and time that works for you on my calendar.</p>`
            : ''
        }`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${escapeHtml(preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5eaf0;">
          <tr>
            <td style="padding:28px 32px 0;font-family:${FONT};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0b1220;letter-spacing:-0.01em;">${escapeHtml(SIGNATURE.name)}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${escapeHtml(SIGNATURE.headline)}</p>
                  </td>
                  <td align="right" valign="top" style="width:72px;">
                    <a href="${escapeHtml(SIGNATURE.site)}" style="font-size:11px;font-weight:600;color:#0f3d68;text-decoration:none;">Portfolio</a>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:#eef2f6;margin:20px 0 0;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;font-family:${FONT};">
              ${bodyHtml}
              ${ctaBlock}
              <div style="height:1px;background:#eef2f6;margin:28px 0 18px;font-size:0;line-height:0;">&nbsp;</div>
              <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;font-family:${FONT};">
                ${escapeHtml(SIGNATURE.name)}<br/>
                <span style="color:#64748b;">${escapeHtml(SIGNATURE.role)}</span><br/>
                <a href="${escapeHtml(SIGNATURE.site)}" style="color:#0f3d68;text-decoration:none;">${escapeHtml(SIGNATURE.site.replace(/^https?:\/\//, ''))}</a>
                &nbsp;·&nbsp;<a href="mailto:${escapeHtml(SIGNATURE.email)}" style="color:#0f3d68;text-decoration:none;">${escapeHtml(SIGNATURE.email)}</a>
              </p>
              ${
                footerNote
                  ? `<p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;font-family:${FONT};">${escapeHtml(footerNote)}</p>`
                  : ''
              }
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;font-family:${FONT};">Reply to this email anytime</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const OUTREACH_BODIES = {
  'outreach-direct': {
    name: 'Direct hire',
    subject: '{{firstName}}, end-to-end product build for {{company}}',
    text: `{{greeting}},

{{fomoLine}}

I ship production software across web, mobile, and desktop, plus AI workflows when they add real leverage. One senior engineer owns scope, milestones, and handoff.

::pain::{{nichePain}}
::solve::One senior owns web, mobile, and desktop from scope to ship
::ease::Clear milestones and handoff — no freelancer juggling
::benefit::Faster delivery · Single accountable owner · Production-ready work
::trust::Trusted by founders worldwide — 97+ shipped projects · 5.0 feedback · clients in 14+ countries
::offer::Web / MERN / Shopify|iOS & Android|Desktop apps|SaaS · CRM · AI

If {{company}} needs that kind of ownership, I am happy to share relevant work.

Portfolio: https://aftabahmadkhan.online

A short reply is enough, or book a brief call on my calendar.`,
    ctaLabel: 'View portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Fiverr or Upwork is fine if that is how you prefer to start.',
  },
  'outreach-ceo': {
    name: 'CEO / founder',
    subject: 'For {{designation}} at {{company}}, delivery without the agency stack',
    text: `{{greeting}},

{{fomoLine}}

Most {{industry}} leaders do not need another slide deck. They need someone who can ship web, mobile, and desktop products and stay on the work.

::pain::{{nichePain}}
::solve::One product engineer across stack — web, mobile, desktop, AI
::ease::You get one thread of communication and one delivery plan
::benefit::Less overhead · Faster decisions · Work that reaches production
::trust::Trusted delivery partner — 97+ projects · 5.0 feedback · 14+ countries
::offer::Web platforms|Mobile apps|Desktop · SaaS|CRM & AI

I can send a short case study relevant to {{company}}. If a quick call helps, choose a time that works for you.`,
    ctaLabel: 'See work & reviews',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Happy to contract via Fiverr or Upwork when that fits your process.',
  },
  'outreach-mobile': {
    name: 'Mobile & desktop',
    subject: '{{company}}: mobile and desktop product engineering',
    text: `{{greeting}},

{{fomoLine}}

Alongside web and SaaS, I design and ship mobile apps (iOS / Android) and desktop applications for teams that need more than a marketing site.

::pain::{{nichePain}}
::solve::Native-quality mobile and desktop built with a solid API and admin
::ease::One builder from prototype to store / installable release
::benefit::Polished UX · Shared backend · Faster path to users
::trust::Builders trust consistency — 97+ shipped projects · 5.0 client feedback
::offer::iOS & Android|Desktop apps|Cross-platform|API + admin

If {{company}} is planning a mobile or desktop build, or a rebuild, I would be glad to walk through approach and timeline.

Portfolio: https://aftabahmadkhan.online`,
    ctaLabel: 'View portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Web, mobile, and desktop can be delivered as one coherent stack.',
  },
  'outreach-region': {
    name: 'Region focus',
    subject: 'Product engineering for teams in {{city}} / {{country}}',
    text: `{{greeting}},

{{fomoLine}}

I partner directly with founders on web platforms, mobile apps, desktop software, Shopify / SaaS, and AI workflows, with no junior handoff.

::pain::{{nichePain}}
::solve::Direct founder partnership with full-stack product ownership
::ease::Simple engagement — scope, build, ship, support
::benefit::Speed to market · Clear accountability · Cross-platform coverage
::trust::Preferred by growing teams — 97+ projects · 5.0 feedback · 14+ countries
::offer::Web · Mobile · Desktop|Shopify · SaaS · CRM|AI automation

Details and reviews: https://aftabahmadkhan.online

If {{company}} is evaluating a build, a short reply works. You can also schedule a brief call.`,
    ctaLabel: 'Open portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Fiverr or Upwork starts are welcome.',
  },
  'outreach-saas': {
    name: 'SaaS product',
    subject: '{{company}}: SaaS / multi-tenant product engineering',
    text: `{{greeting}},

{{fomoLine}}

I design and ship SaaS products end to end — multi-tenant architecture, billing-ready flows, admin panels, and the customer-facing app — without an agency stack between you and delivery.

::pain::{{nichePain}}
::solve::A senior builder who owns SaaS architecture, UX, and ship cycles
::ease::Clear milestones from MVP to production tenants
::benefit::Faster time-to-market · Clean multi-tenant foundation · Production-ready ops
::trust::Trusted by founders shipping real SaaS — 97+ projects · 5.0 feedback
::offer::SaaS / multi-tenant|Subscriptions & billing|Admin + CRM|API & webhooks

If {{company}} is building or rebuilding a SaaS product, I am happy to walk through approach and timeline.

Portfolio: https://aftabahmadkhan.online`,
    ctaLabel: 'View portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Custom SaaS and white-label builds welcome.',
  },
  'outreach-crm': {
    name: 'CRM & ops',
    subject: '{{company}}: CRM and operator tooling that fits your workflow',
    text: `{{greeting}},

{{fomoLine}}

Generic CRMs force your team into someone else’s process. I build custom CRM and ops panels — pipeline, leads, follow-ups, and status write-back — shaped around how {{nicheLabel}} teams actually work.

::pain::{{nichePain}}
::solve::A custom CRM / admin tailored to your pipeline and roles
::ease::Scope the workflows you already use — then ship the tool around them
::benefit::Less spreadsheet chaos · Faster follow-up · Clear ownership
::trust::Operator-first builds — 97+ shipped projects · 5.0 client feedback
::offer::Custom CRM|Pipeline & leads|Admin panels|Sheets / API sync

If {{company}} needs CRM or internal tooling that fits the business, a short call is enough to map the first version.`,
    ctaLabel: 'See related work',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Can connect to Google Sheets, Gmail, and your existing stack.',
  },
  'outreach-enterprise': {
    name: 'Enterprise solutions',
    subject: 'Enterprise delivery for {{company}} — web, mobile, desktop, AI',
    text: `{{greeting}},

{{fomoLine}}

Enterprise teams do not need more vendors. They need accountable delivery across web platforms, mobile, desktop, CRM, and AI workflows — with clear ownership from scope to handoff.

::pain::{{nichePain}}
::solve::One senior product partner for enterprise-grade delivery
::ease::Milestones, documentation, and a single thread of communication
::benefit::Lower coordination tax · Faster decisions · Work that reaches production
::trust::Trusted in 14+ countries — 97+ projects · 5.0 feedback
::offer::Enterprise solutions|Custom platforms|CRM & SaaS|Web · Mobile · Desktop · AI

Happy to share a relevant case study for {{company}}. Book a brief call when it suits you.`,
    ctaLabel: 'Open portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'NDA-friendly engagements and phased rollouts available.',
  },
  'outreach-custom': {
    name: 'Custom solution',
    subject: '{{firstName}}, a custom build for {{company}}?',
    text: `{{greeting}},

{{fomoLine}}

Off-the-shelf tools only go so far. I take custom briefs — SaaS, CRM, internal tools, marketplace, or niche platforms — and ship a tailored solution across web, mobile, and desktop when needed.

::pain::{{nichePain}}
::solve::A custom product scoped to {{company}} — not a forced template
::ease::Discovery → build → ship → support, one accountable owner
::benefit::Fit-for-purpose software · Faster iteration · Clear handoff
::trust::Custom builds for founders worldwide — 97+ projects · 5.0 feedback
::offer::Custom solutions|SaaS & CRM|Enterprise delivery|Web · Mobile · Desktop · AI

If you have a brief, a short reply or a calendar slot works.`,
    ctaLabel: 'View portfolio',
    ctaUrl: SIGNATURE.site,
    secondaryCta: { label: 'Schedule a meeting', url: '{{meetingLink}}' },
    footerNote: 'Fixed-scope or retainer — whichever fits the work.',
  },
}

const PRODUCT_BODIES = {
  'product-intro': {
    name: 'VorksPro intro',
    subject: '{{company}}: publishing and outreach without the tab chaos',
    text: `{{greeting}},

{{fomoLine}}

I built VorksPro so teams can publish and run outreach from one place instead of juggling tools.

::pain::{{nichePain}}
::solve::One calm workspace for publishing and outreach
::ease::Connect accounts, load leads, send — without spreadsheet gymnastics
::benefit::Less tool switching · Clear pipeline · Faster follow-up
::trust::Built for operators who ship — used by founders who hate busywork
::offer::Publish once|Outreach in one place|Live calendars|Campaign tracking

Product: https://vorkspro.com

If it looks useful for {{company}}, pick a time on my calendar and I will walk you through it.`,
    ctaLabel: 'Schedule a meeting',
    ctaUrl: '{{meetingLink}}',
    secondaryCta: { label: 'Visit VorksPro', url: SIGNATURE.product },
  },
  'product-meeting': {
    name: 'Book a demo',
    subject: '15 minutes on VorksPro for {{company}}?',
    text: `{{greeting}},

{{fomoLine}}

VorksPro helps {{industry}} teams in {{region}} publish and follow up without switching between half a dozen tabs.

::pain::{{nichePain}}
::solve::Publishing + outreach + meetings in one flow
::ease::Fifteen minutes to see if it fits your team
::benefit::Visibility · Consistency · Time back every week
::trust::Built by a practitioner — not another bloated marketing suite
::offer::Social publishing|Email outreach|Meetings|Lead tracking

Overview: https://vorkspro.com

Choose any day and time on my Google Calendar that works for you.`,
    ctaLabel: 'Schedule a meeting',
    ctaUrl: '{{meetingLink}}',
    secondaryCta: { label: 'Visit VorksPro', url: SIGNATURE.product },
  },
  'product-region': {
    name: 'Region + product',
    subject: 'VorksPro walkthrough for teams in {{country}}',
    text: `{{greeting}},

{{fomoLine}}

VorksPro is the product I use with founders who want outreach and publishing in one calm workflow.

::pain::{{nichePain}}
::solve::One operator-friendly stack for ship + follow-up
::ease::Book a walkthrough — bring your real workflow questions
::benefit::Cleaner process · Faster campaigns · Less admin drag
::trust::Trusted by teams that value clarity over complexity
::offer::Outreach|Publishing|Calendar booking|Status write-back

https://vorkspro.com

Book a walkthrough when it suits you — any day, any time that works.`,
    ctaLabel: 'Schedule a meeting',
    ctaUrl: '{{meetingLink}}',
    secondaryCta: { label: 'Visit VorksPro', url: SIGNATURE.product },
  },
}

function resolveCtaUrl(url) {
  if (url === '{{meetingLink}}') return '{{meetingLink}}'
  return url
}

function buildTemplate(id, type, def, meetingLink) {
  const booking =
    meetingLink && isBookingUrl(meetingLink) ? meetingLink : getCalendarBookingUrl(meetingLink)
  const rawCta = resolveCtaUrl(def.ctaUrl)
  const ctaUrl = rawCta === '{{meetingLink}}' ? booking : rawCta
  const secondaryCta = def.secondaryCta
    ? {
        label: def.secondaryCta.label,
        url: (() => {
          const raw = resolveCtaUrl(def.secondaryCta.url)
          return raw === '{{meetingLink}}' ? booking : raw
        })(),
      }
    : undefined

  // Plain-text body: value props → trust → tech stack
  const textBody = String(def.text || '')
    .replace(/^::pain::\s*/gm, 'The problem: ')
    .replace(/^::solve::\s*/gm, 'The solution: ')
    .replace(/^::ease::\s*/gm, 'How easy it is: ')
    .replace(/^::benefit::\s*/gm, 'What you get: ')
    .replace(/^::trust::\s*(.*)$/gm, '$1')
    .replace(/^::offer::\s*(.*)$/gm, (_, caps) =>
      `Tech stack: ${caps
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
        .join(' · ')}`,
    )
    .replace(/^::caps::\s*(.*)$/gm, (_, caps) =>
      `Tech stack: ${caps
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
        .join(' · ')}`,
    )
    .replaceAll('{{meetingLink}}', booking)

  let htmlBody = layout({
    preheader: def.subject,
    title: def.name,
    bodyHtml: textToHtmlParagraphs(def.text),
    ctaLabel: def.ctaLabel,
    ctaUrl,
    secondaryCta,
    footerNote: def.footerNote,
  })
  htmlBody = forceScheduleMeetingHrefs(htmlBody, booking)

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
