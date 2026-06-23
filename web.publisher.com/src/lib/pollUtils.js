export const POLL_PLATFORMS = ['linkedin', 'reddit']

export const LINKEDIN_POLL_MAX_OPTIONS = 4
export const REDDIT_POLL_MAX_OPTIONS = 6
export const POLL_MIN_OPTIONS = 2

export const POLL_DURATION_OPTIONS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
]

export const DEFAULT_POLL = {
  enabled: false,
  question: '',
  options: ['', ''],
  allowMultiple: false,
  durationDays: 3,
}

export function platformSupportsPoll(platform) {
  return POLL_PLATFORMS.includes(platform)
}

export function isPollEnabled(state) {
  return Boolean(state?.poll?.enabled)
}

export function maxPollOptionsForPlatforms(platforms = {}) {
  const enabled = Object.entries(platforms)
    .filter(([, on]) => on)
    .map(([p]) => p)
    .filter(platformSupportsPoll)

  if (!enabled.length) return LINKEDIN_POLL_MAX_OPTIONS
  return Math.min(
    ...enabled.map((p) => (p === 'reddit' ? REDDIT_POLL_MAX_OPTIONS : LINKEDIN_POLL_MAX_OPTIONS)),
  )
}

export function validatePollClient(state) {
  if (!isPollEnabled(state)) return { ok: true }

  const question = (state.poll.question || state.body || '').trim()
  const options = (state.poll.options || []).map((o) => o.trim()).filter(Boolean)
  const enabledPlatforms = Object.entries(state.platforms || {})
    .filter(([, on]) => on)
    .map(([p]) => p)

  const pollPlatforms = enabledPlatforms.filter(platformSupportsPoll)
  if (!pollPlatforms.length) {
    return {
      ok: false,
      error: 'Polls work on LinkedIn and Reddit. Enable at least one of those platforms.',
    }
  }

  if (!question) return { ok: false, error: 'Enter a poll question.' }
  if (options.length < POLL_MIN_OPTIONS) {
    return { ok: false, error: `Add at least ${POLL_MIN_OPTIONS} poll options.` }
  }

  const cap = maxPollOptionsForPlatforms(state.platforms)
  if (options.length > cap) {
    return { ok: false, error: `Maximum ${cap} options for your selected poll platforms.` }
  }

  if (state.poll.allowMultiple && pollPlatforms.includes('reddit')) {
    return {
      ok: false,
      error: 'Reddit only supports single-choice polls. Disable multiple choice or turn off Reddit.',
    }
  }

  if (state.images?.length) {
    return { ok: false, error: 'Remove the image to publish a poll, or disable the poll.' }
  }

  if (pollPlatforms.includes('reddit') && state.poll.durationDays > 7) {
    return { ok: false, error: 'Reddit polls can run for at most 7 days.' }
  }

  return { ok: true }
}
