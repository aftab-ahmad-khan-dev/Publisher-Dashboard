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
    label: 'Follow Up',
    subject: 'Quick update — a few project slots left',
  },
  final_call: {
    id: 'final_call',
    label: 'Final Call',
    subject: 'Final development slot + 10% off',
  },
  reason: {
    id: 'reason',
    label: 'Reason',
    subject: 'Quick question about scheduling a call',
  },
}

export function nudgeTypeMeta(type) {
  return TYPES[type] || null
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
      'I was about to onboard 8 projects this cycle — only 4 slots are available now.',
      '',
      'If you’re still exploring a custom product or site build, I’d love to reserve one of those remaining spots for you before they fill.',
      '',
      'Happy to walk through scope, timeline, and fit on a short call — no pressure.',
      '',
      bookLine,
      '',
      'Looking forward to hearing from you.',
      '',
      `— ${signatureName}`,
      signatureSite || '',
    ]
      .filter(Boolean)
      .join('\n')

    htmlBody = `
      <p>${escapeHtml(hi)},</p>
      <p>I was about to onboard <strong>8 projects</strong> this cycle — only <strong>4 slots</strong> are available now.</p>
      <p>If you’re still exploring a custom product or site build, I’d love to reserve one of those remaining spots for you before they fill.</p>
      <p>Happy to walk through scope, timeline, and fit on a short call — no pressure.</p>
      ${
        book
          ? `<p style="margin:20px 0;"><a href="${escapeHtml(book)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Schedule a meeting</a></p>
             <p style="font-size:12px;word-break:break-all;"><a href="${escapeHtml(book)}">${escapeHtml(book)}</a></p>`
          : '<p>Reply to this email and I’ll send you a booking link.</p>'
      }
      <p>Looking forward to hearing from you.</p>
      <p>— ${escapeHtml(signatureName)}${signatureSite ? `<br/><a href="${escapeHtml(signatureSite)}">${escapeHtml(signatureSite)}</a>` : ''}</p>
    `
  } else if (type === 'final_call') {
    text = [
      `${hi},`,
      '',
      'This is a final call — we have the last development booking slot open, and I’m offering 10% off project / product development cost if we lock it in now.',
      '',
      'If timing or budget was holding you back, this should make starting easier. We can still tailor scope to what you need.',
      '',
      bookLine,
      '',
      'If the timing isn’t right, just reply and I’ll close your spot — no hard feelings.',
      '',
      `— ${signatureName}`,
      signatureSite || '',
    ]
      .filter(Boolean)
      .join('\n')

    htmlBody = `
      <p>${escapeHtml(hi)},</p>
      <p><strong>This is a final call</strong> — we have the last development booking slot open, and I’m offering <strong>10% off</strong> project / product development cost if we lock it in now.</p>
      <p>If timing or budget was holding you back, this should make starting easier. We can still tailor scope to what you need.</p>
      ${
        book
          ? `<p style="margin:20px 0;"><a href="${escapeHtml(book)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Claim the last slot</a></p>
             <p style="font-size:12px;word-break:break-all;"><a href="${escapeHtml(book)}">${escapeHtml(book)}</a></p>`
          : '<p>Reply to this email and I’ll send you a booking link.</p>'
      }
      <p>If the timing isn’t right, just reply and I’ll close your spot — no hard feelings.</p>
      <p>— ${escapeHtml(signatureName)}${signatureSite ? `<br/><a href="${escapeHtml(signatureSite)}">${escapeHtml(signatureSite)}</a>` : ''}</p>
    `
  } else {
    text = [
      `${hi},`,
      '',
      'I noticed you reached the booking page but didn’t schedule a meeting yet.',
      '',
      'No worries at all — I’d just love to know what got in the way so I can help:',
      '• Timing / timezone?',
      '• Not sure about scope or budget yet?',
      '• Prefer email first?',
      '• Something else?',
      '',
      'Reply with a quick note (even one line is perfect). If it helps, you can still book here anytime:',
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
      <p>I noticed you reached the booking page but didn’t schedule a meeting yet.</p>
      <p>No worries at all — I’d just love to know what got in the way so I can help:</p>
      <ul>
        <li>Timing / timezone?</li>
        <li>Not sure about scope or budget yet?</li>
        <li>Prefer email first?</li>
        <li>Something else?</li>
      </ul>
      <p>Reply with a quick note (even one line is perfect). If it helps, you can still book here anytime:</p>
      ${
        book
          ? `<p style="margin:16px 0;"><a href="${escapeHtml(book)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Schedule a meeting</a></p>`
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
