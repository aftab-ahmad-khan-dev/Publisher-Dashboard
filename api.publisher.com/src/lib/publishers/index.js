import { canPublishLinkedIn, buildPostText } from '../platforms.js'
import { publishToFacebook, publishToInstagram } from './meta.js'
import { publishToLinkedIn } from './linkedin.js'
import { publishToReddit } from './reddit.js'
import { publishToQuora } from './quora.js'
import { publishToPinterest } from './pinterest.js'
import { publishToThreads } from './threads.js'
import { resolvePublicImageUrls } from '../mediaHost.js'
import { logger } from '../logger.js'
import { isPollEnabled, platformSupportsPoll } from '../pollPolicy.js'

function normalizePostMedia(postState) {
  if (!postState) return postState
  let next = postState

  // Canonical carousel field is `imageDataUrls` (array). Derive it from the legacy
  // single-image fields (`imageDataUrl`, then bulk `imagePreview`) when absent.
  if (!Array.isArray(next.imageDataUrls) || !next.imageDataUrls.length) {
    const single = next.imageDataUrl || next.imagePreview
    if (single) next = { ...next, imageDataUrls: [single] }
  }

  // Keep `imageDataUrl` pointing at the first image so single-image publishers
  // (Pinterest, legacy Facebook/LinkedIn paths) keep working unchanged.
  if (
    Array.isArray(next.imageDataUrls) &&
    next.imageDataUrls.length &&
    !next.imageDataUrl
  ) {
    next = { ...next, imageDataUrl: next.imageDataUrls[0] }
  }

  return next
}

export async function publishToAllPlatforms({ platforms, postState, config, workspaceId }) {
  const results = []
  const errors = []
  const normalizedPostState = normalizePostMedia(postState)
  const pollMode = isPollEnabled(normalizedPostState)

  for (const platform of platforms) {
    try {
      if (pollMode && !platformSupportsPoll(platform)) {
        errors.push({
          platform,
          error: `${platform} does not support polls. Skipped.`,
          skipped: true,
        })
        continue
      }

      const text = buildPostText(normalizedPostState, platform)
      if (platform === 'facebook') {
        results.push(
          await publishToFacebook({
            message: text,
            pageToken: config.meta.pageToken,
            postState: normalizedPostState,
          }),
        )
      } else if (platform === 'instagram') {
        const imageUrls = await resolvePublicImageUrls({
          postState: normalizedPostState,
          workspaceId,
          platform: 'instagram',
        })
        results.push(
          await publishToInstagram({
            message: text,
            pageToken: config.meta.pageToken,
            imageUrls,
          }),
        )
      } else if (platform === 'linkedin') {
        if (!canPublishLinkedIn(config.linkedin)) {
          throw new Error(
            'LinkedIn access token required. Add it in API Config after OAuth.',
          )
        }
        results.push(
          await publishToLinkedIn({
            text,
            orgUrn: config.linkedin.orgUrn,
            accessToken: config.linkedin.accessToken,
            postState: normalizedPostState,
          }),
        )
      } else if (platform === 'reddit') {
        results.push(
          await publishToReddit({ text, postState: normalizedPostState, reddit: config.reddit }),
        )
      } else if (platform === 'quora') {
        results.push(
          await publishToQuora({
            text,
            quora: config.quora,
            postState: normalizedPostState,
          }),
        )
      } else if (platform === 'pinterest') {
        results.push(
          await publishToPinterest({
            text,
            postState: normalizedPostState,
            pinterest: config.pinterest,
          }),
        )
      } else if (platform === 'threads') {
        // Threads, like Instagram, needs public image URLs — base64/uploads
        // aren't accepted. Resolve the scheduled post's images the same way.
        const imageUrls = await resolvePublicImageUrls({
          postState: normalizedPostState,
          workspaceId,
          platform: 'threads',
        })
        results.push(
          await publishToThreads({
            text,
            imageUrls,
            threads: config.threads,
          }),
        )
      }
    } catch (err) {
      logger.warn('Platform publish failed', { platform, error: err.message })
      errors.push({ platform, error: err.message })
    }
  }

  if (errors.length && !results.length) {
    return { ok: false, error: errors.map((e) => `${e.platform}: ${e.error}`).join('; ') }
  }

  return { ok: true, results, errors: errors.length ? errors : undefined }
}
