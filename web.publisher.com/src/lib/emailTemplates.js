/**
 * Outreach + product email templates (plain-text / UI fallback).
 * Structure: greeting → FOMO/pain punch → body → offer block (caps + value) → CTA.
 */

export const SIGNATURE = {
  name: 'Aftab Ahmad Khan',
  role: 'Product Engineer · Web · Mobile · Desktop · AI',
  headline: 'Full-stack web, native mobile, and desktop apps',
  site: 'https://aftabahmadkhan.online',
  email: 'aftabahmadkhan.dev@gmail.com',
  product: 'https://vorkspro.com',
}

export function formatSignature({ includeMeeting = false, meetingLink = '' } = {}) {
  const lines = [SIGNATURE.name, SIGNATURE.role, SIGNATURE.site, SIGNATURE.email]
  if (includeMeeting && meetingLink) {
    lines.push(`Schedule a meeting: ${meetingLink}`)
  }
  return lines.join('\n')
}

const TRUST =
  'Trusted by founders worldwide — 97+ shipped projects · 5.0 feedback · clients in 14+ countries'

export const OUTREACH_TEMPLATES = [
  {
    id: 'outreach-direct',
    name: 'Direct hire',
    type: 'outreach',
    subject: '{{firstName}}, end-to-end product build for {{company}}',
    body: `{{greeting}},

{{fomoLine}}

I ship production software across web, mobile, and desktop, plus AI workflows when they add real leverage. One senior engineer owns scope, milestones, and handoff.

The problem: {{nichePain}}
The solution: One senior owns web, mobile, and desktop from scope to ship
How easy it is: Clear milestones and handoff — no freelancer juggling
What you get: Faster delivery · Single accountable owner · Production-ready work
${TRUST}
Tech stack: Web / MERN / Shopify · iOS & Android · Desktop apps · SaaS · CRM · AI

If {{company}} needs that kind of ownership, I am happy to share relevant work.

Portfolio: https://aftabahmadkhan.online

A short reply is enough, or book a brief call: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-ceo',
    name: 'CEO / founder',
    type: 'outreach',
    subject: 'For {{designation}} at {{company}}, delivery without the agency stack',
    body: `{{greeting}},

{{fomoLine}}

Most {{industry}} leaders do not need another slide deck. They need someone who can ship web, mobile, and desktop products and stay on the work.

The problem: {{nichePain}}
The solution: One product engineer across stack — web, mobile, desktop, AI
How easy it is: You get one thread of communication and one delivery plan
What you get: Less overhead · Faster decisions · Work that reaches production
Trusted delivery partner — 97+ projects · 5.0 feedback · 14+ countries
Tech stack: Web platforms · Mobile apps · Desktop · SaaS · CRM & AI

I can send a short case study relevant to {{company}}. If a quick call helps: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-mobile',
    name: 'Mobile & desktop',
    type: 'outreach',
    subject: '{{company}}: mobile and desktop product engineering',
    body: `{{greeting}},

{{fomoLine}}

Alongside web and SaaS, I design and ship mobile apps (iOS / Android) and desktop applications for teams that need more than a marketing site.

The problem: {{nichePain}}
The solution: Native-quality mobile and desktop built with a solid API and admin
How easy it is: One builder from prototype to store / installable release
What you get: Polished UX · Shared backend · Faster path to users
Builders trust consistency — 97+ shipped projects · 5.0 client feedback
Tech stack: iOS & Android · Desktop apps · Cross-platform · API + admin

If {{company}} is planning a mobile or desktop build, or a rebuild, I would be glad to walk through approach and timeline.

Portfolio: https://aftabahmadkhan.online

Schedule a meeting: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-region',
    name: 'Region focus',
    type: 'outreach',
    subject: 'Product engineering for teams in {{city}} / {{country}}',
    body: `{{greeting}},

{{fomoLine}}

I partner directly with founders on web platforms, mobile apps, desktop software, Shopify / SaaS, and AI workflows, with no junior handoff.

The problem: {{nichePain}}
The solution: Direct founder partnership with full-stack product ownership
How easy it is: Simple engagement — scope, build, ship, support
What you get: Speed to market · Clear accountability · Cross-platform coverage
Preferred by growing teams — 97+ projects · 5.0 feedback · 14+ countries
Tech stack: Web · Mobile · Desktop · Shopify · SaaS · CRM · AI automation

Details and reviews: https://aftabahmadkhan.online

If {{company}} is evaluating a build, a short reply works. Or schedule a brief call: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-saas',
    name: 'SaaS product',
    type: 'outreach',
    subject: '{{company}}: SaaS / multi-tenant product engineering',
    body: `{{greeting}},

{{fomoLine}}

I design and ship SaaS products end to end — multi-tenant architecture, billing-ready flows, admin panels, and the customer-facing app — without an agency stack between you and delivery.

The problem: {{nichePain}}
The solution: A senior builder who owns SaaS architecture, UX, and ship cycles
How easy it is: Clear milestones from MVP to production tenants
What you get: Faster time-to-market · Clean multi-tenant foundation · Production-ready ops
Trusted by founders shipping real SaaS — 97+ projects · 5.0 feedback
Tech stack: SaaS / multi-tenant · Subscriptions & billing · Admin + CRM · API & webhooks

If {{company}} is building or rebuilding a SaaS product, I am happy to walk through approach and timeline.

Portfolio: https://aftabahmadkhan.online

Schedule a meeting: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-crm',
    name: 'CRM & ops',
    type: 'outreach',
    subject: '{{company}}: CRM and operator tooling that fits your workflow',
    body: `{{greeting}},

{{fomoLine}}

Generic CRMs force your team into someone else’s process. I build custom CRM and ops panels — pipeline, leads, follow-ups, and status write-back — shaped around how {{nicheLabel}} teams actually work.

The problem: {{nichePain}}
The solution: A custom CRM / admin tailored to your pipeline and roles
How easy it is: Scope the workflows you already use — then ship the tool around them
What you get: Less spreadsheet chaos · Faster follow-up · Clear ownership
Operator-first builds — 97+ shipped projects · 5.0 client feedback
Tech stack: Custom CRM · Pipeline & leads · Admin panels · Sheets / API sync

If {{company}} needs CRM or internal tooling that fits the business, a short call is enough to map the first version.

Schedule a meeting: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-enterprise',
    name: 'Enterprise solutions',
    type: 'outreach',
    subject: 'Enterprise delivery for {{company}} — web, mobile, desktop, AI',
    body: `{{greeting}},

{{fomoLine}}

Enterprise teams do not need more vendors. They need accountable delivery across web platforms, mobile, desktop, CRM, and AI workflows — with clear ownership from scope to handoff.

The problem: {{nichePain}}
The solution: One senior product partner for enterprise-grade delivery
How easy it is: Milestones, documentation, and a single thread of communication
What you get: Lower coordination tax · Faster decisions · Work that reaches production
Trusted in 14+ countries — 97+ projects · 5.0 feedback
Tech stack: Enterprise solutions · Custom platforms · CRM & SaaS · Web · Mobile · Desktop · AI

Happy to share a relevant case study for {{company}}. Book a brief call when it suits you: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'outreach-custom',
    name: 'Custom solution',
    type: 'outreach',
    subject: '{{firstName}}, a custom build for {{company}}?',
    body: `{{greeting}},

{{fomoLine}}

Off-the-shelf tools only go so far. I take custom briefs — SaaS, CRM, internal tools, marketplace, or niche platforms — and ship a tailored solution across web, mobile, and desktop when needed.

The problem: {{nichePain}}
The solution: A custom product scoped to {{company}} — not a forced template
How easy it is: Discovery → build → ship → support, one accountable owner
What you get: Fit-for-purpose software · Faster iteration · Clear handoff
Custom builds for founders worldwide — 97+ projects · 5.0 feedback
Tech stack: Custom solutions · SaaS & CRM · Enterprise delivery · Web · Mobile · Desktop · AI

If you have a brief, a short reply or a calendar slot works: {{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
]

export const PRODUCT_TEMPLATES = [
  {
    id: 'product-intro',
    name: 'VorksPro intro',
    type: 'product',
    subject: '{{company}}: publishing and outreach without the tab chaos',
    body: `{{greeting}},

{{fomoLine}}

I built VorksPro so teams can publish and run outreach from one place instead of juggling tools.

The problem: {{nichePain}}
The solution: One calm workspace for publishing and outreach
How easy it is: Connect accounts, load leads, send — without spreadsheet gymnastics
What you get: Less tool switching · Clear pipeline · Faster follow-up
Built for operators who ship — used by founders who hate busywork
Publish once · Outreach in one place · Live calendars · Campaign tracking
Custom · Enterprise · CRM · SaaS builds available when you need more than a seat

Product: https://vorkspro.com

If it looks useful for {{company}}, pick any day and time on my calendar:
{{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'product-meeting',
    name: 'Book a demo',
    type: 'product',
    subject: '15 minutes on VorksPro for {{company}}?',
    body: `{{greeting}},

{{fomoLine}}

VorksPro helps {{industry}} teams in {{region}} publish and follow up without switching between half a dozen tabs.

The problem: {{nichePain}}
The solution: Publishing + outreach + meetings in one flow
How easy it is: Fifteen minutes to see if it fits your team
What you get: Visibility · Consistency · Time back every week
Built by a practitioner — not another bloated marketing suite
Social publishing · Email outreach · Meetings · Lead tracking
Also: Custom · Enterprise · CRM · SaaS builds scoped to your team

Overview: https://vorkspro.com

Choose any day and time on my Google Calendar:
{{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
  {
    id: 'product-region',
    name: 'Region + product',
    type: 'product',
    subject: 'VorksPro walkthrough for teams in {{country}}',
    body: `{{greeting}},

{{fomoLine}}

VorksPro is the product I use with founders who want outreach and publishing in one calm workflow.

The problem: {{nichePain}}
The solution: One operator-friendly stack for ship + follow-up
How easy it is: Book a walkthrough — bring your real workflow questions
What you get: Cleaner process · Faster campaigns · Less admin drag
Trusted by teams that value clarity over complexity
Outreach · Publishing · Calendar booking · Status write-back
Custom · Enterprise · CRM · SaaS builds for teams that need a tailored stack

https://vorkspro.com

Book a walkthrough any day and time that works:
{{meetingLink}}

${formatSignature({ includeMeeting: true, meetingLink: '{{meetingLink}}'})}`,
  },
]

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
  const FONT =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  return list.map((t) => {
    const link = meetingLink || '{{meetingLink}}'
    const body = String(t.body || '').replaceAll('{{meetingLink}}', link)
    const scheduleBtn = link
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;">
  <tr>
    <td style="padding-right:10px;padding-bottom:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:8px;background:#0b1220;">
          <a href="${SIGNATURE.site}" style="display:inline-block;padding:12px 18px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${FONT};">View portfolio</a>
        </td>
      </tr></table>
    </td>
    <td style="padding-bottom:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:8px;background:#0f3d68;">
          <a href="${link}" style="display:inline-block;padding:12px 18px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${FONT};">Schedule a meeting</a>
        </td>
      </tr></table>
    </td>
  </tr>
</table>
<p style="font-size:12px;color:#64748b;margin:0 0 16px;font-family:${FONT};">Choose any day and time that works for you on my calendar.</p>`
      : ''
    let htmlBody = body.includes('<table role="presentation"')
      ? body
      : `<div style="font-family:${FONT};line-height:1.7;color:#1e293b;font-size:15px;">${body
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>\n')}</div>${scheduleBtn}`
    if (meetingLink) {
      htmlBody = htmlBody.replace(
        /<a\b([^>]*?)href\s*=\s*(["'])([^"']*)\2([^>]*)>([\s\S]*?)<\/a>/gi,
        (full, pre, quote, _href, post, inner) => {
          const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          if (!/schedule\s+a\s+meeting|schedule\s+meeting|pick\s+a\s+time/i.test(text)) return full
          return `<a${pre}href=${quote}${meetingLink}${quote}${post}>${inner}</a>`
        },
      )
    }
    return {
      name: t.name,
      subject: t.subject,
      textBody: body,
      htmlBody,
    }
  })
}
