import { canPublishLinkedIn, buildPostText } from '../platforms.js'
import { publishToFacebook, publishToInstagram } from './meta.js'
import { publishToLinkedIn } from './linkedin.js'
import { publishToReddit } from './reddit.js'
import { publishToQuora } from './quora.js'
import { publishToPinterest } from './pinterest.js'
import { publishToThreads } from './threads.js'
import { resolvePublicImageUrl } from '../mediaHost.js'
import { logger } from '../logger.js'

export async function publishToAllPlatforms({ platforms, postState, config, workspaceId }) {
  const results = []
  const errors = []

  for (const platform of platforms) {
    try {
      const text = buildPostText(postState, platform)
      if (platform === 'facebook') {
        results.push(
          await publishToFacebook({
            message: text,
            pageToken: config.meta.pageToken,
            postState,
          }),
        )
      } else if (platform === 'instagram') {
        const imageUrl = await resolvePublicImageUrl({ postState, workspaceId })
        results.push(
          await publishToInstagram({
            message: text,
            pageToken: config.meta.pageToken,
            imageUrl,
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
            postState,
          }),
        )
      } else if (platform === 'reddit') {
        results.push(await publishToReddit({ text, postState, reddit: config.reddit }))
      } else if (platform === 'quora') {
        results.push(await publishToQuora({ text, quora: config.quora, postState }))
      } else if (platform === 'pinterest') {
        results.push(await publishToPinterest({ text, postState, pinterest: config.pinterest }))
      } else if (platform === 'threads') {
        results.push(await publishToThreads({ text, postState, threads: config.threads }))
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
