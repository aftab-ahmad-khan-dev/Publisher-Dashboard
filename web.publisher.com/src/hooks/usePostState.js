import { useState, useCallback, useMemo } from 'react'
import { draftToComposerState } from '../lib/draftUtils'
import { DEFAULT_PLATFORMS, DEFAULT_IMAGE_VISIBILITY } from '../lib/constants'

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const INITIAL_STATE = {
  body: '',
  image: null,
  imagePreviewUrl: null,
  imageType: null,
  cropHint: 'square',
  imageVisibility: { ...DEFAULT_IMAGE_VISIBILITY },
  hashtags: [],
  platforms: { ...DEFAULT_PLATFORMS },
  publishMode: 'now',
  scheduledAt: '',
  timezone: DEFAULT_TIMEZONE,
}

export const PLATFORM_LIMITS = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  reddit: 40000,
  quora: 50000,
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

export function usePostState() {
  const [state, setState] = useState(INITIAL_STATE)
  const [editingDraftId, setEditingDraftId] = useState(null)

  const setBody = useCallback((body) => {
    setState((s) => ({ ...s, body }))
  }, [])

  const setImage = useCallback((file) => {
    setState((s) => {
      if (s.imagePreviewUrl) URL.revokeObjectURL(s.imagePreviewUrl)
      if (!file) {
        return {
          ...s,
          image: null,
          imagePreviewUrl: null,
          imageType: null,
        }
      }
      const isVideo = file.type.startsWith('video/')
      return {
        ...s,
        image: file,
        imagePreviewUrl: URL.createObjectURL(file),
        imageType: isVideo ? 'video' : 'image',
      }
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

  const hashtagCounts = useMemo(() => {
    const counts = { instagram: 0, facebook: 0, linkedin: 0, reddit: 0, quora: 0 }
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
      if (s.imagePreviewUrl) URL.revokeObjectURL(s.imagePreviewUrl)
      return { ...INITIAL_STATE, timezone: s.timezone }
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
    setImage,
    setCropHint,
    toggleImageVisibility,
    togglePlatform,
    addHashtag,
    removeHashtag,
    toggleHashtagPlatform,
    setPublishMode,
    setScheduledAt,
    setTimezone,
    hashtagCounts,
    getBodyForPlatform,
    getFullLength,
  }
}
