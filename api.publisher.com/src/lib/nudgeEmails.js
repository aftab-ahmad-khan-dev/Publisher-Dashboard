/**
 * Follow-up / final-call / reason emails for engaged leads.
 */

function firstNameFrom(recipient) {
  const name = String(recipient?.name || recipient?.mergeData?.name || '').trim()
  const fromMerge = String(recipient?.mergeData?.firstName || '').trim()
  if (fromMerge) return fromMerge
  if (name) return name.split(/\s+/).filter(Boolean)[0] || ''
  return ''
}

function greeting(recipient) {
  const first = firstNameFrom(recipient)
  return first ? `Hi ${first}` : 'Hi there'
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const TYPES = {
  follow_up: {
    id: 'follow_up',
    label: 'Gentle nudge',
    subject: 'Still thinking this through? Happy to help',
  },
  final_call: {
    id: 'final_call',
    label: 'Last chance',
    subject: 'One open slot — and 10% off if now works',
  },
  reason: {
    id: 'reason',
    label: 'Check in',
    subject: 'Quick check-in — no pressure',
  },
}

export function nudgeTypeMeta(type) {
  return TYPES[type] || null
}

/** Stable key for “status unchanged” checks in the auto nudge pipeline. */
export function currentMeetingStatusKey(recipient) {
  return String(recipient?.meetingStatus || 'none')
}

export function engagementStartedAt(recipient) {
  if (!recipient) return null
  if (recipient.nudgeEngagedAt) return new Date(recipient.nudgeEngagedAt)
  const times = [recipient.openedAt, recipient.clickedAt, recipient.meetingClickedAt]
    .filter(Boolean)
    .map((t) => new Date(t).getTime())
    .filter((t) => Number.isFinite(t))
  if (!times.length) return null
  return new Date(Math.min(...times))
}

export function buildNudgeEmail({ type, recipient, bookingUrl, signatureName = 'Aftab', signatureSite = '' }) {
  const meta = nudgeTypeMeta(type)
  if (!meta) return null

  const hi = greeting(recipient)
  const book = String(bookingUrl || '').trim()
  const bookLine = book
    ? `You can pick a time here: ${book}`
    : 'Reply to this email and I’ll send you a booking link.'

  let text = ''
  let htmlBody = ''

  if (type === 'follow_up') {
    text = [
      `${hi},`,
      '',
      'Just circling back gently — I’ve got a couple of open build slots this cycle, and I didn’t want your note to get lost in the shuffle.',
      '',
      'If you’re still exploring a custom product or site, I’d be glad to hold a spot and walk through scope, timeline, and fit on a short call. Totally fine if the timing isn’t right yet.',
      '',
      bookLine,
      '',
      'Either way, wishing you a clear next step.',
      '',
      `— ${signatureName}`,
      signatureSite || '',
    ]
      .filter(Boolean)
      .join('\n')

    htmlBody = `
      <p>${escapeHtml(hi)},</p>
      <p>Just circling back gently — I’ve got a couple of open build slots this cycle, and I didn’t want your note to get lost in the shuffle.</p>
      <p>If you’re still exploring a custom product or site, I’d be glad to hold a spot and walk through scope, timeline, and fit on a short call. Totally fine if the timing isn’t right yet.</p>
      ${
        book
          ? `<p style="margin:20px 0;"><a href="${escapeHtml(book)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Pick a time that works</a></p>
             <p style="font-size:12px;word-break:break-all;"><a href="${escapeHtml(book)}">${escapeHtml(book)}</a></p>`
          : '<p>Reply to this email and I’ll send you a booking link.</p>'
      }
      <p>Either way, wishing you a clear next step.</p>
      <p>— ${escapeHtml(signatureName)}${signatureSite ? `<br/><a href="${escapeHtml(signatureSite)}">${escapeHtml(signatureSite)}</a>` : ''}</p>
    `
  } else if (type === 'final_call') {
    text = [
      `${hi},`,
      '',
      'I’ll keep this short and honest — I have one development slot left for this cycle, and I’m offering 10% off if locking it in now would help.',
      '',
      'If timing or budget was the blocker, this might make starting easier. We can still shape scope around what you actually need.',
      '',
      bookLine,
      '',
      'If now isn’t the moment, just reply and I’ll close the loop kindly — no hard feelings at all.',
      '',
      `— ${signatureName}`,
      signatureSite || '',
    ]
      .filter(Boolean)
      .join('\n')

    htmlBody = `
      <p>${escapeHtml(hi)},</p>
      <p>I’ll keep this short and honest — I have <strong>one development slot</strong> left for this cycle, and I’m offering <strong>10% off</strong> if locking it in now would help.</p>
      <p>If timing or budget was the blocker, this might make starting easier. We can still shape scope around what you actually need.</p>
      ${
        book
          ? `<p style="margin:20px 0;"><a href="${escapeHtml(book)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Reserve the slot</a></p>
             <p style="font-size:12px;word-break:break-all;"><a href="${escapeHtml(book)}">${escapeHtml(book)}</a></p>`
          : '<p>Reply to this email and I’ll send you a booking link.</p>'
      }
      <p>If now isn’t the moment, just reply and I’ll close the loop kindly — no hard feelings at all.</p>
      <p>— ${escapeHtml(signatureName)}${signatureSite ? `<br/><a href="${escapeHtml(signatureSite)}">${escapeHtml(signatureSite)}</a>` : ''}</p>
    `
  } else {
    text = [
      `${hi},`,
      '',
      'I noticed you reached the booking page but didn’t schedule yet — totally fine.',
      '',
      'I’m only checking in so I can be useful, not pushy. If something got in the way, I’d love a one-line reply:',
      '• Timing / timezone?',
      '• Still figuring out scope or budget?',
      '• Prefer to keep it on email for now?',
      '• Something else entirely?',
      '',
      'Whenever you’re ready, you can still book here:',
      book || '(reply and I’ll send a link)',
      '',
      'Happy to make this easy for you.',
      '',
      `— ${signatureName}`,
      signatureSite || '',
    ]
      .filter(Boolean)
      .join('\n')

    htmlBody = `
      <p>${escapeHtml(hi)},</p>
      <p>I noticed you reached the booking page but didn’t schedule yet — totally fine.</p>
      <p>I’m only checking in so I can be useful, not pushy. If something got in the way, I’d love a one-line reply:</p>
      <ul>
        <li>Timing / timezone?</li>
        <li>Still figuring out scope or budget?</li>
        <li>Prefer to keep it on email for now?</li>
        <li>Something else entirely?</li>
      </ul>
      <p>Whenever you’re ready, you can still book here:</p>
      ${
        book
          ? `<p style="margin:16px 0;"><a href="${escapeHtml(book)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Schedule when it suits you</a></p>`
          : ''
      }
      <p>Happy to make this easy for you.</p>
      <p>— ${escapeHtml(signatureName)}${signatureSite ? `<br/><a href="${escapeHtml(signatureSite)}">${escapeHtml(signatureSite)}</a>` : ''}</p>
    `
  }

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.55;font-size:15px;">${htmlBody}</body></html>`

  return {
    type,
    label: meta.label,
    subject: meta.subject,
    text,
    html,
  }
}

export function isNudgeEligible(recipient) {
  if (!recipient) return false
  if (recipient.meetingStatus === 'scheduled' || recipient.meetingStatus === 'completed') {
    return false
  }
  const opened =
    (recipient.openCount || 0) > 0 ||
    Boolean(recipient.openedAt) ||
    recipient.status === 'opened' ||
    recipient.status === 'clicked'
  const meetingEngaged =
    recipient.meetingStatus === 'link_clicked' ||
    recipient.meetingStatus === 'invited' ||
    Boolean(recipient.meetingClickedAt)
  return opened || meetingEngaged
}
