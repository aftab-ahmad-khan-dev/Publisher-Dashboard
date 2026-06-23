import { useState, useCallback, useMemo } from 'react'
import { draftToComposerState } from '../lib/draftUtils'
import { DEFAULT_PLATFORMS, DEFAULT_IMAGE_VISIBILITY } from '../lib/constants'
import { DEFAULT_POLL } from '../lib/pollUtils'

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

// Instagram/Threads carousels top out at 10/20 items; cap at 10 for all platforms.
export const MAX_IMAGES = 10

const INITIAL_STATE = {
  body: '',
  // Carousel: ordered list of { id, file, previewUrl, type } entries.
  images: [],
  cropHint: 'square',
  imageVisibility: { ...DEFAULT_IMAGE_VISIBILITY },
  hashtags: [],
  platforms: { ...DEFAULT_PLATFORMS },
  publishMode: 'now',
  scheduledAt: '',
  timezone: DEFAULT_TIMEZONE,
  poll: { ...DEFAULT_POLL },
}

export const PLATFORM_LIMITS = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  reddit: 40000,
  pinterest: 500,
  threads: 500,
}

export const CROP_HINTS = [
  { id: 'square', label: 'Square (1:1)', ratio: '1 / 1' },
  { id: 'portrait', label: 'Portrait (4:5)', ratio: '4 / 5' },
  { id: 'landscape', label: 'Landscape (1.91:1)', ratio: '1.91 / 1' },
]

function normalizeTag(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function makeImageEntry(file) {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    type: file.type.startsWith('video/') ? 'video' : 'image',
  }
}

export function usePostState() {
  const [state, setState] = useState(INITIAL_STATE)
  const [editingDraftId, setEditingDraftId] = useState(null)

  const setBody = useCallback((body) => {
    setState((s) => ({ ...s, body }))
  }, [])

  const addImages = useCallback((files) => {
    const incoming = Array.from(files || []).filter(
      (f) => f.type.startsWith('image/') || f.type === 'video/mp4',
    )
    if (!incoming.length) return
    setState((s) => {
      const room = MAX_IMAGES - s.images.length
      if (room <= 0) return s
      const added = incoming.slice(0, room).map(makeImageEntry)
      return { ...s, images: [...s.images, ...added] }
    })
  }, [])

  const removeImage = useCallback((id) => {
    setState((s) => {
      const target = s.images.find((im) => im.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return { ...s, images: s.images.filter((im) => im.id !== id) }
    })
  }, [])

  const moveImage = useCallback((id, delta) => {
    setState((s) => {
      const idx = s.images.findIndex((im) => im.id === id)
      if (idx < 0) return s
      const next = idx + delta
      if (next < 0 || next >= s.images.length) return s
      const images = [...s.images]
      const [moved] = images.splice(idx, 1)
      images.splice(next, 0, moved)
      return { ...s, images }
    })
  }, [])

  const clearImages = useCallback(() => {
    setState((s) => {
      s.images.forEach((im) => URL.revokeObjectURL(im.previewUrl))
      return { ...s, images: [] }
    })
  }, [])

  const setCropHint = useCallback((cropHint) => {
    setState((s) => ({ ...s, cropHint }))
  }, [])

  const toggleImageVisibility = useCallback((platform) => {
    setState((s) => ({
      ...s,
      imageVisibility: {
        ...s.imageVisibility,
        [platform]: !s.imageVisibility[platform],
      },
    }))
  }, [])

  const togglePlatform = useCallback((platform) => {
    setState((s) => ({
      ...s,
      platforms: {
        ...s.platforms,
        [platform]: !s.platforms[platform],
      },
    }))
  }, [])

  const addHashtag = useCallback((raw) => {
    const tag = normalizeTag(raw)
    if (!tag) return false
    setState((s) => {
      if (s.hashtags.some((h) => h.tag.toLowerCase() === tag.toLowerCase())) {
        return s
      }
      return {
        ...s,
        hashtags: [
          ...s.hashtags,
          {
            id: crypto.randomUUID(),
            tag,
            platforms: { ...DEFAULT_PLATFORMS },
          },
        ],
      }
    })
    return true
  }, [])

  const removeHashtag = useCallback((id) => {
    setState((s) => ({
      ...s,
      hashtags: s.hashtags.filter((h) => h.id !== id),
    }))
  }, [])

  const toggleHashtagPlatform = useCallback((id, platform) => {
    setState((s) => ({
      ...s,
      hashtags: s.hashtags.map((h) =>
        h.id === id
          ? {
              ...h,
              platforms: {
                ...h.platforms,
                [platform]: !h.platforms[platform],
              },
            }
          : h,
      ),
    }))
  }, [])

  const setPublishMode = useCallback((publishMode) => {
    setState((s) => ({ ...s, publishMode }))
  }, [])

  const setScheduledAt = useCallback((scheduledAt) => {
    setState((s) => ({ ...s, scheduledAt }))
  }, [])

  const setTimezone = useCallback((timezone) => {
    setState((s) => ({ ...s, timezone }))
  }, [])

  const setPoll = useCallback((poll) => {
    setState((s) => ({ ...s, poll: { ...s.poll, ...poll } }))
  }, [])

  const hashtagCounts = useMemo(() => {
    const counts = { instagram: 0, facebook: 0, linkedin: 0, reddit: 0, pinterest: 0, threads: 0 }
    state.hashtags.forEach((h) => {
      Object.keys(counts).forEach((p) => {
        if (h.platforms[p]) counts[p]++
      })
    })
    return counts
  }, [state.hashtags])

  const getBodyForPlatform = useCallback(
    (platform) => {
      const tags = state.hashtags
        .filter((h) => h.platforms[platform])
        .map((h) => h.tag)
        .join(' ')
      const base = state.body.trim()
      return tags ? (base ? `${base}\n\n${tags}` : tags) : base
    },
    [state.body, state.hashtags],
  )

  const getFullLength = useCallback(
    (platform) => getBodyForPlatform(platform).length,
    [getBodyForPlatform],
  )

  const loadDraft = useCallback((draft) => {
    setState(draftToComposerState(draft))
    setEditingDraftId(draft.id)
  }, [])

  const resetComposer = useCallback(() => {
    setState((s) => {
      s.images.forEach((im) => URL.revokeObjectURL(im.previewUrl))
      return { ...INITIAL_STATE, images: [], timezone: s.timezone }
    })
    setEditingDraftId(null)
  }, [])

  const clearEditingDraft = useCallback(() => setEditingDraftId(null), [])

  return {
    state,
    editingDraftId,
    setEditingDraftId,
    loadDraft,
    resetComposer,
    clearEditingDraft,
    setBody,
    addImages,
    removeImage,
    moveImage,
    clearImages,
    setCropHint,
    toggleImageVisibility,
    togglePlatform,
    addHashtag,
    removeHashtag,
    toggleHashtagPlatform,
    setPublishMode,
    setScheduledAt,
    setTimezone,
    setPoll,
    hashtagCounts,
    getBodyForPlatform,
    getFullLength,
  }
}
