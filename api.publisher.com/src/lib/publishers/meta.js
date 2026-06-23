function formatMetaError(data) {
  const err = data?.error || {}
  const msg = err.message || 'Meta API request failed'
  const code = err.code ?? err.error_subcode
  if (code === 190 || /session has expired|expired/i.test(msg)) {
    return (
      `${msg} ` +
      'Generate a new Page access token (Meta Developer → Tools → Graph API Explorer, or your app’s token tool), ' +
      'then paste it in API Config → PAGE TOKEN and click Test & save Meta.'
    )
  }
  return msg
}

const PAGE_TOKEN_HELP =
  'This needs a PAGE access token, not a User token. In Graph API Explorer set "User or Page" to your Page (not your name) to mint one, or call GET /me/accounts with your user token and copy the page\'s access_token. Make sure pages_manage_posts and pages_read_engagement are granted, then paste it in API Config → PAGE TOKEN.'

/**
 * Inspect the token via /debug_token (needs app credentials). Returns the token
 * `type` (PAGE | USER | ...) and granted `scopes`, or null if it can't be checked.
 */
async function inspectToken(meta, token) {
  const appId = meta.appId?.trim()
  const appSecret = meta.appSecret?.trim()
  if (!appId || !appSecret) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error || !data.data) return null
    return data.data
  } catch {
    return null
  }
}

export async function testMetaConnection(meta) {
  const token = meta.pageToken?.trim()
  if (!token) {
    return { ok: false, error: 'Page access token is required.' }
  }
  const url = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    return { ok: false, error: formatMetaError(data), expired: data.error?.code === 190 }
  }

  // A valid /me response is not enough: a User token also answers here, but it
  // cannot publish a live Page post (the post lands as draft/scheduled instead).
  const info = await inspectToken(meta, token)
  if (info) {
    if (info.type && info.type !== 'PAGE') {
      return {
        ok: false,
        error: `This is a ${info.type} token, so Facebook publishes posts as drafts instead of live. ${PAGE_TOKEN_HELP}`,
        wrongTokenType: info.type,
      }
    }
    const scopes = info.scopes || []
    if (!scopes.includes('pages_manage_posts')) {
      return {
        ok: false,
        error: `This token is missing the pages_manage_posts permission, so posts will not go live. ${PAGE_TOKEN_HELP}`,
      }
    }
  }

  return { ok: true, message: `Meta connected as ${data.name || data.id}` }
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = String(dataUrl).split(',')
  const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  return new Blob([Buffer.from(b64 || '', 'base64')], { type: contentType })
}

/** Collect a post's images as an ordered array, tolerating legacy single-image fields. */
function collectImageDataUrls(postState) {
  if (Array.isArray(postState?.imageDataUrls) && postState.imageDataUrls.length) {
    return postState.imageDataUrls.filter(Boolean)
  }
  return postState?.imageDataUrl ? [postState.imageDataUrl] : []
}

/** Upload one photo to the Page unpublished and return its photo id (for carousels). */
async function uploadFacebookPhoto({ pageToken, dataUrl, imageUrl }) {
  const url = `https://graph.facebook.com/v21.0/me/photos`
  let res
  if (imageUrl) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, published: false, access_token: pageToken }),
    })
  } else {
    const form = new FormData()
    form.append('source', dataUrlToBlob(dataUrl), 'image.jpg')
    form.append('published', 'false')
    form.append('access_token', pageToken)
    res = await fetch(url, { method: 'POST', body: form })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Facebook photo upload failed')
  }
  return data.id
}

export async function publishToFacebook({ message, pageToken, postState }) {
  // Respect the per-platform image toggle; default to including images when present.
  const wantImage = postState?.imageVisibility?.facebook !== false
  const dataUrls = wantImage ? collectImageDataUrls(postState) : []
  const imageUrl = wantImage ? postState?.imageUrl : null

  if (dataUrls.some((u) => /^data:video\//i.test(u))) {
    throw new Error(
      'Facebook video publishing is not supported yet. Attach an image or remove the video.',
    )
  }

  // Multiple images → upload each unpublished, then a single feed post that
  // attaches them all (Facebook renders this as a multi-photo post).
  if (dataUrls.length > 1) {
    const mediaFbids = []
    for (const dataUrl of dataUrls) {
      mediaFbids.push(await uploadFacebookPhoto({ pageToken, dataUrl }))
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/me/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        attached_media: mediaFbids.map((id) => ({ media_fbid: id })),
        published: true,
        access_token: pageToken,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || 'Facebook photo publish failed')
    }
    return { platform: 'facebook', postId: data.id }
  }

  // Single image → post to /me/photos (a /me/feed text post drops the image).
  const dataUrl = dataUrls[0]
  if (dataUrl || imageUrl) {
    const url = `https://graph.facebook.com/v21.0/me/photos`
    let res
    if (imageUrl && !dataUrl) {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          caption: message,
          published: true,
          access_token: pageToken,
        }),
      })
    } else {
      const form = new FormData()
      form.append('source', dataUrlToBlob(dataUrl), 'image.jpg')
      if (message) form.append('caption', message)
      form.append('published', 'true')
      form.append('access_token', pageToken)
      res = await fetch(url, { method: 'POST', body: form })
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || 'Facebook photo publish failed')
    }
    return { platform: 'facebook', postId: data.post_id || data.id }
  }

  // Text-only feed post. `published: true` is the default, but we set it explicitly
  // so the post can never land in a draft/scheduled state.
  const res = await fetch(`https://graph.facebook.com/v21.0/me/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, published: true, access_token: pageToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Facebook publish failed')
  }
  return { platform: 'facebook', postId: data.id }
}

/** Resolve the IG Business account ID linked to the Page this token controls. */
async function resolveInstagramUserId(pageToken) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${encodeURIComponent(pageToken)}`,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(formatMetaError(data) || 'Could not read the Instagram account from the Page.')
  }
  const igId = data.instagram_business_account?.id
  if (!igId) {
    throw new Error(
      'No Instagram Business account is linked to this Facebook Page. In Meta settings, link an Instagram Business/Creator account to the Page, and ensure the token has instagram_basic + instagram_content_publish.',
    )
  }
  return igId
}

/** Poll the media container until it finishes processing (images are usually instant). */
async function waitForContainer(creationId, pageToken, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(pageToken)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error('Instagram could not process the image (is the URL public and a supported format?).')
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
}

/** Create an IG media container with the given fields; returns its creation id. */
async function createInstagramContainer(igUserId, pageToken, fields) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...fields, access_token: pageToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Instagram media container creation failed')
  }
  return data.id
}

/** Publish an already-finished IG container; returns the published media id. */
async function publishInstagramContainer(igUserId, pageToken, creationId) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: pageToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Instagram publish failed')
  }
  return data.id
}

export async function publishToInstagram({ message, pageToken, imageUrls }) {
  const urls = (Array.isArray(imageUrls) ? imageUrls : imageUrls ? [imageUrls] : []).filter(Boolean)
  // IG has no text-only posts; without a public image URL there's nothing to publish.
  if (!urls.length) {
    throw new Error(
      'Instagram requires an image, text-only posts cannot be published. Attach an image or disable Instagram for this post.',
    )
  }

  const igUserId = await resolveInstagramUserId(pageToken)

  // Single image: one container, then publish.
  if (urls.length === 1) {
    const creationId = await createInstagramContainer(igUserId, pageToken, {
      image_url: urls[0],
      caption: message,
    })
    await waitForContainer(creationId, pageToken)
    const postId = await publishInstagramContainer(igUserId, pageToken, creationId)
    return { platform: 'instagram', postId }
  }

  // Carousel (2–10 items): a child container per image, then a CAROUSEL parent.
  const childIds = []
  for (const url of urls.slice(0, 10)) {
    childIds.push(
      await createInstagramContainer(igUserId, pageToken, {
        image_url: url,
        is_carousel_item: true,
      }),
    )
  }
  for (const childId of childIds) {
    await waitForContainer(childId, pageToken)
  }
  const parentId = await createInstagramContainer(igUserId, pageToken, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption: message,
  })
  await waitForContainer(parentId, pageToken)
  const postId = await publishInstagramContainer(igUserId, pageToken, parentId)
  return { platform: 'instagram', postId, mode: 'carousel' }
}
