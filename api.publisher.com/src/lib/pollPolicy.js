import { sanitizePublishedText } from './contentSanitize.js'

/** Platforms that support native poll publishing via API. */
export const POLL_PLATFORMS = ['linkedin', 'reddit']

export const LINKEDIN_POLL_MAX_OPTIONS = 4
export const REDDIT_POLL_MAX_OPTIONS = 6
export const POLL_MIN_OPTIONS = 2

export const POLL_DURATION_OPTIONS = [
  { days: 1, label: '1 day', linkedIn: 'ONE_DAY' },
  { days: 3, label: '3 days', linkedIn: 'THREE_DAYS' },
  { days: 7, label: '1 week', linkedIn: 'SEVEN_DAYS' },
  { days: 14, label: '2 weeks', linkedIn: 'FOURTEEN_DAYS' },
]

export function platformSupportsPoll(platform) {
  return POLL_PLATFORMS.includes(platform)
}

export function isPollEnabled(postState) {
  return Boolean(postState?.poll?.enabled)
}

function cleanOption(text) {
  return sanitizePublishedText(String(text || '').trim())
}

export function normalizePoll(postState) {
  if (!postState?.poll?.enabled) return null

  const question = cleanOption(postState.poll.question || postState.body)
  const options = (postState.poll.options || [])
    .map(cleanOption)
    .filter(Boolean)

  const durationDays = Number(postState.poll.durationDays) || 3
  const durationEntry =
    POLL_DURATION_OPTIONS.find((d) => d.days === durationDays) || POLL_DURATION_OPTIONS[1]

  return {
    enabled: true,
    question,
    options,
    allowMultiple: Boolean(postState.poll.allowMultiple),
    durationDays: durationEntry.days,
    linkedInDuration: durationEntry.linkedIn,
  }
}

export function maxPollOptions(platform) {
  if (platform === 'reddit') return REDDIT_POLL_MAX_OPTIONS
  if (platform === 'linkedin') return LINKEDIN_POLL_MAX_OPTIONS
  return LINKEDIN_POLL_MAX_OPTIONS
}

export function validatePoll(postState, platforms = []) {
  if (!isPollEnabled(postState)) return { ok: true }

  const poll = normalizePoll(postState)
  const pollPlatforms = platforms.filter(platformSupportsPoll)
  const unsupported = platforms.filter((p) => !platformSupportsPoll(p))

  if (!pollPlatforms.length) {
    return {
      ok: false,
      error: 'Polls are supported on LinkedIn and Reddit only. Enable one of those platforms.',
    }
  }

  if (!poll.question) {
    return { ok: false, error: 'Poll question is required.' }
  }

  if (poll.question.length > 140) {
    return { ok: false, error: 'Poll question must be 140 characters or fewer (LinkedIn limit).' }
  }

  if (poll.options.length < POLL_MIN_OPTIONS) {
    return { ok: false, error: `Add at least ${POLL_MIN_OPTIONS} poll options.` }
  }

  const cap = Math.max(...pollPlatforms.map((p) => maxPollOptions(p)))
  if (poll.options.length > cap) {
    return {
      ok: false,
      error: `Too many poll options for selected platforms (max ${cap}).`,
    }
  }

  for (const platform of pollPlatforms) {
    const limit = maxPollOptions(platform)
    if (poll.options.length > limit) {
      return {
        ok: false,
        error: `${platform} polls allow up to ${limit} options.`,
      }
    }
  }

  if (poll.allowMultiple && pollPlatforms.includes('reddit')) {
    return {
      ok: false,
      error: 'Reddit polls only support single-choice voting. Turn off multiple choice or disable Reddit.',
    }
  }

  const hasImage =
    Boolean(postState?.imageDataUrls?.length) ||
    Boolean(postState?.imageUrls?.length) ||
    Boolean(postState?.imageDataUrl) ||
    Boolean(postState?.imagePreview) ||
    Boolean(postState?.imageUrl) ||
    Boolean(postState?.image)
  if (hasImage) {
    return {
      ok: false,
      error: 'Poll posts cannot include an image. Remove the image or disable the poll.',
    }
  }

  if (pollPlatforms.includes('reddit') && (poll.durationDays < 1 || poll.durationDays > 7)) {
    return { ok: false, error: 'Reddit poll duration must be between 1 and 7 days.' }
  }

  return { ok: true, poll, pollPlatforms, unsupported }
}

export function hasPostContent(postState) {
  if (isPollEnabled(postState)) return true
  return Boolean(postState?.body?.trim())
}
