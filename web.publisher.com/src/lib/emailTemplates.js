/**
 * Themed outreach + product (VorksPro) email templates with FOMO + signature.
 * Merge tags: {{greeting}} {{firstName}} {{company}} {{designation}} {{city}}
 * {{country}} {{region}} {{industry}} {{fomoLine}} {{meetingLink}}
 */

export const SIGNATURE = {
  name: 'Aftab Ahmad Khan',
  role: 'Solo Full-Stack Developer · MERN · Shopify · AI',
  site: 'https://aftabahmadkhan.online',
  email: 'aftabahmadkhan.dev@gmail.com',
  product: 'https://vorkspro.com',
}

export function formatSignature({ includeMeeting = false, meetingLink = '' } = {}) {
  const lines = [
    SIGNATURE.name,
    SIGNATURE.role,
    SIGNATURE.site,
    SIGNATURE.email,
  ]
  if (includeMeeting && meetingLink) {
    lines.push(`Schedule a meeting (pick a free slot): ${meetingLink}`)
  }
  return lines.join('\n')
}

export const OUTREACH_TEMPLATES = [
  {
    id: 'outreach-direct',
    name: 'Direct hire',
    type: 'outreach',
    subject: '{{firstName}}, production software without the agency overhead',
    body: `{{greeting}},

I help founders ship production MERN, Shopify, SaaS, and AI products end-to-end — solo, no outsourcing.

{{fomoLine}}. If {{company}} needs a senior builder who owns scope, milestones, and handoff, I may be a fit.

Portfolio & proof: https://aftabahmadkhan.online
(97+ projects · 5.0 feedback · clients in 14+ countries)

If you prefer to start the contract on Fiverr or Upwork, that works for me too — happy to meet you where your process already is.

Worth a short reply?

Prefer a quick call? Schedule a meeting (pick a free slot): {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-ceo',
    name: 'CEO / founder',
    type: 'outreach',
    subject: 'For {{designation}} at {{company}} — senior delivery, direct hire',
    body: `{{greeting}},

Most {{industry}} teams I talk to in {{country}} don't need another agency slide deck. They need someone who ships.

I'm Aftab — solo full-stack (MERN, Shopify, AI automation). {{fomoLine}}.

Happy to share a short case study relevant to {{company}}. If contracting via Fiverr/Upwork is easier on your side, I'm fine with that as well.

Prefer a quick call? Schedule a meeting: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-fomo',
    name: 'Region FOMO',
    type: 'outreach',
    subject: '{{city}} / {{country}} teams are tightening their build stack',
    body: `{{greeting}},

{{fomoLine}} — especially around MERN SaaS, Shopify ops, and AI workflows.

I partner directly with founders (no junior handoff). Details: https://aftabahmadkhan.online

Open to a quick reply if {{company}} is evaluating a build or rebuild. Fiverr/Upwork contracts are fine if that's your preferred start.

Prefer a quick call? Schedule a meeting: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
]

export const PRODUCT_TEMPLATES = [
  {
    id: 'product-intro',
    name: 'VorksPro intro',
    type: 'product',
    subject: '{{company}} — a faster ops stack with VorksPro',
    body: `{{greeting}},

{{fomoLine}}. I built VorksPro to help teams cut the busywork between tools and get publishing + outreach under control.

Product: https://vorkspro.com

If it looks relevant for {{company}}, pick a time on my calendar that works for you — availability is live:
{{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'product-meeting',
    name: 'Book a demo',
    type: 'product',
    subject: '15 min on VorksPro for {{company}}?',
    body: `{{greeting}},

Quick context: VorksPro helps {{industry}} teams in {{region}} ship and follow up without tab chaos.

See it here: https://vorkspro.com

Schedule a meeting — you'll only see times I'm free:
{{meetingLink}}

Looking forward to it if the timing works.

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'product-fomo',
    name: 'Region + product',
    type: 'product',
    subject: '{{country}} teams are booking VorksPro walkthroughs',
    body: `{{greeting}},

{{fomoLine}}. VorksPro is the product I use with founders who want outreach + publishing in one place.

https://vorkspro.com

Book a walkthrough when it suits you — the link shows my live availability:
{{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
]

/** Legacy pain-first templates kept for shuffle compatibility */
export const EMAIL_TEMPLATES = [
  ...OUTREACH_TEMPLATES.map((t) => ({ name: t.name, subject: t.subject, body: t.body })),
  ...PRODUCT_TEMPLATES.map((t) => ({ name: t.name, subject: t.subject, body: t.body })),
]

export function templatesForType(type) {
  if (type === 'product') return PRODUCT_TEMPLATES
  if (type === 'outreach') return OUTREACH_TEMPLATES
  return [...OUTREACH_TEMPLATES, ...PRODUCT_TEMPLATES]
}

export function toCampaignTemplates(list, meetingLink = '') {
  return list.map((t) => {
    const link = meetingLink || '{{meetingLink}}'
    const body = String(t.body || '').replaceAll('{{meetingLink}}', link)
    const scheduleBtn = link
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 4px;">
  <tr>
    <td style="padding-right:10px;padding-bottom:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:10px;background:#0f172a;">
          <a href="${SIGNATURE.site}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View portfolio</a>
        </td>
      </tr></table>
    </td>
    <td style="padding-bottom:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:10px;background:#4f46e5;">
          <a href="${link}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Schedule a meeting</a>
        </td>
      </tr></table>
    </td>
  </tr>
</table>
<p style="font-size:12px;color:#64748b;margin:0 0 16px;">Schedule opens my Google Calendar — only available times are shown.</p>`
      : ''
    const htmlBody = body.includes('<table role="presentation"')
      ? body
      : `<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#111">${body
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>\n')}</div>${scheduleBtn}`
    return {
      name: t.name,
      subject: t.subject,
      textBody: body,
      htmlBody,
    }
  })
}
