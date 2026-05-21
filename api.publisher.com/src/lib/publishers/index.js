import { canPublishLinkedIn, buildPostText } from '../platforms.js'
import { publishToFacebook, publishToInstagram } from './meta.js'
import { publishToLinkedIn } from './linkedin.js'

export async function publishToAllPlatforms({ platforms, postState, config }) {
  const text = buildPostText(postState)
  const results = []
  const errors = []

  for (const platform of platforms) {
    try {
      if (platform === 'facebook') {
        results.push(
          await publishToFacebook({ message: text, pageToken: config.meta.pageToken }),
        )
      } else if (platform === 'instagram') {
        results.push(
          await publishToInstagram({ message: text, pageToken: config.meta.pageToken }),
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
          }),
        )
      }
    } catch (err) {
      errors.push({ platform, error: err.message })
    }
  }

  if (errors.length && !results.length) {
    return { ok: false, error: errors.map((e) => `${e.platform}: ${e.error}`).join('; ') }
  }

  return { ok: true, results, errors: errors.length ? errors : undefined }
}
