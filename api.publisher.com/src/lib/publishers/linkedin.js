// LinkedIn pins each monthly REST version for ~12 months then sunsets it, so a
// hardcoded value eventually returns "Requested version YYYYMM01 is not active".
// Keep this within the trailing ~12 months; override via env when it ages out.
import { normalizePoll } from '../pollPolicy.js'

const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION?.trim() || '202601'

function parseLinkedInError(status, raw) {
  let data = {}
  try {
    data = JSON.parse(raw)
  } catch {
    data = { message: raw }
  }
  const code = data.code || data.serviceErrorCode
  const message = data.message || raw || `LinkedIn API error (${status})`

  if (status === 401 || code === 'INVALID_ACCESS_TOKEN' || /invalid access token/i.test(message)) {
    return (
      'LinkedIn rejected the access token. Generate a new token for app “Publisher” (Client ID must match), ' +
      'paste the full string with Copy access token, then Save LinkedIn now. ' +
      'For profile posts the token needs scopes openid + profile + w_member_social (the first two are required to look up your member URN); leave Org URN blank or remove placeholder 12345. ' +
      'For company posts also add w_organization_social + r_organization_social and a real urn:li:organization:ID.'
    )
  }
  return message
}

async function fetchLinkedInUserinfo(accessToken) {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const raw = await res.text()
  if (!res.ok) {
    throw new Error(parseLinkedInError(res.status, raw))
  }
  return JSON.parse(raw)
}

function personUrnFromUserinfo(data) {
  if (!data?.sub) return null
  const sub = String(data.sub)
  if (sub.startsWith('urn:li:')) return sub
  return `urn:li:person:${sub}`
}

function isPlaceholderOrgUrn(orgUrn) {
  const org = orgUrn?.trim()
  if (!org) return true
  return /^urn:li:organization:12345$/i.test(org)
}

function isValidOrganizationUrn(orgUrn) {
  const org = orgUrn?.trim()
  if (!org || isPlaceholderOrgUrn(org)) return false
  if (/^https?:\/\//i.test(org) || org.includes('linkedin.com')) return false
  return /^urn:li:organization:\d+$/i.test(org)
}

/** Prefer real org URN; otherwise post as the authenticated member (w_member_social). */
export async function resolveLinkedInAuthor(accessToken, orgUrn) {
  const userinfo = await fetchLinkedInUserinfo(accessToken)
  const useOrg = isValidOrganizationUrn(orgUrn)

  if (useOrg) {
    return { author: orgUrn.trim(), mode: 'organization', userinfo }
  }

  const person = personUrnFromUserinfo(userinfo)
  if (!person) {
    throw new Error('Could not resolve LinkedIn member URN. Reconnect via OAuth in API Config.')
  }
  return { author: person, mode: 'member', userinfo }
}

export async function testLinkedInConnection(linkedin) {
  const token = linkedin.accessToken?.trim()
  if (!token) {
    return {
      ok: true,
      message:
        'LinkedIn app credentials saved. Add an Access Token to publish (OAuth required).',
      needsToken: true,
    }
  }

  try {
    const { author, mode, userinfo } = await resolveLinkedInAuthor(token, linkedin.orgUrn)
    const name = userinfo.name || userinfo.given_name || ''
    const modeLabel = mode === 'organization' ? 'organization page' : 'personal profile'
    return {
      ok: true,
      message: `LinkedIn token valid${name ? ` (${name})` : ''}. Will publish to ${modeLabel} (${author}).`,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Upload an image to LinkedIn and return its urn:li:image:... id.
 * Two steps: initializeUpload (get an uploadUrl + image urn), then PUT the bytes.
 */
async function uploadLinkedInImage({ token, author, dataUrl }) {
  const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_VERSION,
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  })
  const initRaw = await initRes.text()
  if (!initRes.ok) {
    throw new Error(parseLinkedInError(initRes.status, initRaw))
  }
  const initData = JSON.parse(initRaw)
  const uploadUrl = initData.value?.uploadUrl
  const imageUrn = initData.value?.image
  if (!uploadUrl || !imageUrn) {
    throw new Error('LinkedIn did not return an image upload URL.')
  }

  const [meta, b64] = String(dataUrl).split(',')
  const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  const upRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: Buffer.from(b64 || '', 'base64'),
  })
  if (!upRes.ok) {
    const upRaw = await upRes.text().catch(() => '')
    throw new Error(`LinkedIn image upload failed (${upRes.status}). ${upRaw}`.trim())
  }

  return imageUrn
}

export async function publishToLinkedIn({ text, orgUrn, accessToken, postState }) {
  const token = accessToken?.trim()
  if (!token) {
    throw new Error('LinkedIn access token is missing. Connect OAuth or paste a token in API Config.')
  }

  const { author, mode } = await resolveLinkedInAuthor(token, orgUrn)
  const poll = normalizePoll(postState)
  let postMode = 'text'

  const body = {
    author,
    commentary: text || poll?.question || '',
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  if (poll) {
    postMode = 'poll'
    body.content = {
      poll: {
        question: poll.question,
        options: poll.options.map((option) => ({ text: option })),
        settings: {
          duration: poll.linkedInDuration,
          voteSelectionType: poll.allowMultiple ? 'MULTIPLE_VOTE' : 'SINGLE_VOTE',
        },
      },
    }
  } else {
    // Optionally attach images (respect the per-platform image toggle).
    const wantImage = postState?.imageVisibility?.linkedin !== false
    const dataUrls = (
      wantImage
        ? Array.isArray(postState?.imageDataUrls) && postState.imageDataUrls.length
          ? postState.imageDataUrls
          : postState?.imageDataUrl
            ? [postState.imageDataUrl]
            : []
        : []
    ).filter((u) => typeof u === 'string' && u.startsWith('data:image/'))

    if (dataUrls.length === 1) {
      const imageUrn = await uploadLinkedInImage({ token, author, dataUrl: dataUrls[0] })
      body.content = { media: { id: imageUrn } }
      postMode = 'image'
    } else if (dataUrls.length > 1) {
      const imageUrns = []
      for (const dataUrl of dataUrls) {
        imageUrns.push(await uploadLinkedInImage({ token, author, dataUrl }))
      }
      body.content = {
        multiImage: { images: imageUrns.map((id) => ({ id, altText: '' })) },
      }
      postMode = 'multiImage'
    }
  }

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_VERSION,
    },
    body: JSON.stringify(body),
  })

  const raw = await res.text()
  if (!res.ok) {
    throw new Error(parseLinkedInError(res.status, raw))
  }

  let data = {}
  try {
    data = JSON.parse(raw)
  } catch {
    data = {}
  }

  const postId = res.headers.get('x-restli-id') || data.id
  return {
    platform: 'linkedin',
    postId,
    authorMode: mode,
    mode: postMode,
  }
}
