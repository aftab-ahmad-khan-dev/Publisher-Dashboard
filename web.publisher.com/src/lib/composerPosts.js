import {
  parseBulkContent,
  buildImageMapFromMediaItems,
  assignImagesToPosts,
} from './bulkParse'

/**
 * Build numbered posts from composer state: content blocks + image indices.
 * Image 1 → Post 1 (Day 1), image 2 → Post 2 (Day 2), etc.
 */
export function getComposerPosts(state) {
  const imageMap = buildImageMapFromMediaItems(state.mediaItems || [])
  const imageCount = imageMap.size
  const parsed = parseBulkContent(state.body || '')

  if (imageCount <= 1 && parsed.length <= 1) {
    const single = parsed[0] || {
      postNum: 1,
      dayNum: state.scheduleDayNum || 1,
      title: 'Post 1',
      body: (state.body || '').trim(),
      id: 'compose-1',
    }
    return assignImagesToPosts([single], imageMap)
  }

  const targetCount = Math.max(parsed.length, imageCount, 1)
  const byNum = new Map()
  for (const p of parsed) {
    const n = p.postNum ?? p.dayNum
    if (n != null) byNum.set(n, p)
  }

  const posts = []
  for (let n = 1; n <= targetCount; n++) {
    const existing = byNum.get(n)
    posts.push({
      id: `compose-${n}`,
      postNum: n,
      dayNum: existing?.dayNum ?? n,
      title: existing?.title ?? `Post ${n} (Day ${n})`,
      body: existing?.body ?? (parsed.length === 1 ? parsed[0]?.body ?? '' : ''),
    })
  }

  return assignImagesToPosts(posts, imageMap)
}

export function isMultiPostComposer(state) {
  return getComposerPosts(state).length > 1
}

export function composerPostCount(state) {
  return getComposerPosts(state).length
}
