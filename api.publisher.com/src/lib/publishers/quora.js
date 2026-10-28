export function isQuoraConfigured(quora) {
  return Boolean(quora?.profileUrl?.trim())
}

export async function testQuoraConnection(quora) {
  if (!isQuoraConfigured(quora)) {
    return {
      ok: false,
      error: 'Quora profile URL is required (Quora has no public write API — guided posting).',
    }
  }
  try {
    const u = new URL(quora.profileUrl.trim())
    if (!u.hostname.includes('quora.com')) {
      return { ok: false, error: 'Profile URL must be a quora.com link.' }
    }
  } catch {
    return { ok: false, error: 'Invalid Quora profile URL.' }
  }
  return {
    ok: true,
    message:
      'Quora profile saved. Posts will be formatted for manual paste — focus on helpful answers, not ads.',
    mode: 'guided',
  }
}

/** Quora does not offer a supported public API for posting answers. */
export async function publishToQuora({ text, quora, postState }) {
  if (!isQuoraConfigured(quora)) {
    throw new Error('Quora profile URL is required in API Config.')
  }

  const spaceHint = quora.defaultTopic?.trim() || ''
  const copyText = spaceHint
    ? `Topic context: ${spaceHint}\n\n${text}`
    : text

  return {
    platform: 'quora',
    ok: true,
    mode: 'guided',
    message:
      'Copy your answer and post on Quora manually. Quora rewards depth and expertise, not promotion.',
    copyText,
    openUrl: quora.profileUrl.trim(),
    questionHint: postState?.quoraQuestion?.trim() || '',
  }
}
