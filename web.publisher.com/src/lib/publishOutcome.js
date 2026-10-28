import { PLATFORM_META } from './constants.js'
import { isLocalApi } from './apiBaseUrl.js'

function platformLabel(key) {
  return PLATFORM_META[key]?.label || key
}

const IMAGE_PLATFORMS = new Set(['instagram', 'facebook', 'threads', 'pinterest'])

/** Build user-facing publish outcome from API platformResults + warnings. */
export function formatPublishOutcome(result, enabledPlatforms = []) {
  const succeeded = (result.platformResults || []).map((r) => r.platform)
  const failed = (result.warnings || []).filter((w) => !w.skipped)
  const skipped = (result.warnings || []).filter((w) => w.skipped)

  if (!failed.length && !skipped.length) {
    const names = (succeeded.length ? succeeded : enabledPlatforms).map(platformLabel)
    return { type: 'success', message: `Published to ${names.join(', ')}.` }
  }

  const parts = []
  if (succeeded.length) {
    parts.push(`Published to ${succeeded.map(platformLabel).join(', ')}.`)
  } else {
    parts.push('Nothing was published.')
  }

  if (failed.length) {
    const detail = failed
      .map((w) => `${platformLabel(w.platform)}: ${w.error}`)
      .join(' · ')
    parts.push(`Failed: ${detail}`)
  }

  if (skipped.length) {
    parts.push(`Skipped: ${skipped.map((w) => platformLabel(w.platform)).join(', ')}`)
  }

  if (
    isLocalApi() &&
    failed.some((w) => IMAGE_PLATFORMS.has(w.platform))
  ) {
    parts.push(
      'Local tip: Instagram, Facebook, and Threads need a publicly reachable image URL. Deploy the API or publish text-only while testing locally.',
    )
  }

  const type = succeeded.length ? 'warning' : 'error'
  return { type, message: parts.join(' ') }
}
