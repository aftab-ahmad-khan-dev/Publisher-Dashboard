import crypto from 'crypto'

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function buildMime({ from, to, subject, text, html }) {
  const boundary = `pulse_${crypto.randomBytes(8).toString('hex')}`
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text || '',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html || text || '',
    '',
    `--${boundary}--`,
  ]
  return lines.join('\r\n')
}

export function injectTrackingPixel(html, trackingUrl) {
  if (!html || !trackingUrl) return html
  const pixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`)
  }
  return `${html}${pixel}`
}

export async function sendGmailMessage({ accessToken, from, to, subject, text, html }) {
  const raw = base64UrlEncode(
    buildMime({
      from,
      to,
      subject,
      text,
      html,
    }),
  )

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || `Gmail send failed (${res.status})`)
  }

  return { messageId: data.id, threadId: data.threadId }
}

export async function testGmailConnection(gmail, accessToken) {
  if (!accessToken) {
    return { ok: false, error: 'Connect Gmail via OAuth first.' }
  }
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error?.message || 'Gmail API check failed' }
  }
  return {
    ok: true,
    message: `Gmail connected (${data.emailAddress}). Sends appear in Sent — Mailsuite extension can track opens there too.`,
    emailAddress: data.emailAddress,
  }
}
