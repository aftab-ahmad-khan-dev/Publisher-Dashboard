import { useState, useCallback, useMemo } from 'react'
import { draftToComposerState } from '../lib/draftUtils'
import { DEFAULT_PLATFORMS, DEFAULT_IMAGE_VISIBILITY, MAX_UPLOAD_IMAGES } from '../lib/constants'
import { DEFAULT_POLL } from '../lib/pollUtils'
import { todayDateInputValue, getDefaultBulkStartDate } from '../lib/scheduleUtils'

import { imageIndexFromFilename } from '../lib/bulkParse'

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
export { MAX_UPLOAD_IMAGES as MAX_MEDIA_ITEMS }

const ACCEPT_MEDIA = (file) =>
  file.type.startsWith('image/') || file.type === 'video/mp4'

function fileToMediaItem(file, index = null) {
  const isVideo = file.type.startsWith('video/')
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    type: isVideo ? 'video' : 'image',
    index,
  }
}

function revokeMediaItems(items = []) {
  items.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
}

const INITIAL_STATE = {
  body: '',
  mediaItems: [],
  activeMediaId: null,
  cropHint: 'square',
  imageVisibility: { ...DEFAULT_IMAGE_VISIBILITY },
  hashtags: [],
  platforms: { ...DEFAULT_PLATFORMS },
  publishMode: 'now',
  scheduledAt: '',
  timezone: DEFAULT_TIMEZONE,
  scheduleByDay: false,
  scheduleStartDate: getDefaultBulkStartDate(),
  scheduleDayNum: 1,
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
  { id: 'original', label: 'Original', ratio: null },
  { id: 'square', label: 'Square (1:1)', ratio: '1 / 1' },
  { id: 'portrait', label: 'Portrait (4:5)', ratio: '4 / 5' },
  { id: 'landscape', label: 'Landscape (1.91:1)', ratio: '1.91 / 1' },
]

/** Aspect ratio for preview framing; `null` = keep native dimensions. */
export function getCropAspectRatio(cropHint, fallback = '1 / 1') {
  if (cropHint === 'original') return null
  return CROP_HINTS.find((c) => c.id === cropHint)?.ratio ?? fallback
}

function normalizeTag(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

/** Derive legacy single-image fields from the active media item. */
export function enrichPostState(state) {
  const active =
    state.mediaItems?.find((m) => m.id === state.activeMediaId) ?? state.mediaItems?.[0] ?? null
  return {
    ...state,
    image: active?.file ?? null,
    imagePreviewUrl: active?.previewUrl ?? null,
    imageType: active?.type ?? null,
  }
}

export function usePostState() {
  const [rawState, setRawState] = useState(INITIAL_STATE)
  const [editingDraftId, setEditingDraftId] = useState(null)

  const state = useMemo(() => enrichPostState(rawState), [rawState])

  const setBody = useCallback((body) => {
    setRawState((s) => ({ ...s, body }))
  }, [])

  const addMediaFiles = useCallback((fileList) => {
    const incoming = [...(fileList || [])].filter(ACCEPT_MEDIA)
    if (!incoming.length) return

    setRawState((s) => {
      const usedIndices = new Set(
        s.mediaItems.map((m) => m.index).filter((n) => n != null),
      )
      let nextAuto = 1
      const claimIndex = (preferred) => {
        if (preferred != null && !usedIndices.has(preferred)) {
          usedIndices.add(preferred)
          return preferred
        }
        while (usedIndices.has(nextAuto)) nextAuto++
        const n = nextAuto
        usedIndices.add(n)
        nextAuto++
        return n
      }

      const toAdd = []
      for (const file of incoming) {
        if (s.mediaItems.length + toAdd.length >= MAX_UPLOAD_IMAGES) break
        const fromName = imageIndexFromFilename(file.name)
        const index = claimIndex(fromName)
        toAdd.push(fileToMediaItem(file, index))
      }
      if (!toAdd.length) return s

      const mediaItems = [...s.mediaItems, ...toAdd]
      const activeMediaId = s.activeMediaId || toAdd[0].id
      return { ...s, mediaItems, activeMediaId }
    })
  }, [])

  const removeMedia = useCallback((id) => {
    setRawState((s) => {
      const removed = s.mediaItems.find((m) => m.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      const mediaItems = s.mediaItems.filter((m) => m.id !== id)
      let activeMediaId = s.activeMediaId
      if (activeMediaId === id) activeMediaId = mediaItems[0]?.id ?? null
      return { ...s, mediaItems, activeMediaId }
    })
  }, [])

  const setActiveMedia = useCallback((id) => {
    setRawState((s) => ({ ...s, activeMediaId: id }))
  }, [])

  const clearMedia = useCallback(() => {
    setRawState((s) => {
      revokeMediaItems(s.mediaItems)
      return { ...s, mediaItems: [], activeMediaId: null }
    })
  }, [])

  /** @deprecated Use addMediaFiles / clearMedia — kept for narrow call sites */
  const setImage = useCallback((file) => {
    if (!file) {
      clearMedia()
      return
    }
    setRawState((s) => {
      revokeMediaItems(s.mediaItems)
      const fromName = imageIndexFromFilename(file.name)
      const item = fileToMediaItem(file, fromName ?? 1)
      return { ...s, mediaItems: [item], activeMediaId: item.id }
    })
  }, [clearMedia])

  const setCropHint = useCallback((cropHint) => {
    setRawState((s) => ({ ...s, cropHint }))
  }, [])

  const replaceActiveMedia = useCallback((file) => {
    if (!file || !ACCEPT_MEDIA(file)) return
    setRawState((s) => {
      const activeId = s.activeMediaId
      if (!activeId) {
        const item = fileToMediaItem(file, 1)
        return { ...s, mediaItems: [item], activeMediaId: item.id }
      }
      const mediaItems = s.mediaItems.map((m) => {
        if (m.id !== activeId) return m
        if (m.previewUrl) URL.revokeObjectURL(m.previewUrl)
        return {
          ...m,
          file,
          previewUrl: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
        }
      })
      return { ...s, mediaItems }
    })
  }, [])

  const toggleImageVisibility = useCallback((platform) => {
    setRawState((s) => ({
      ...s,
      imageVisibility: {
        ...s.imageVisibility,
        [platform]: !s.imageVisibility[platform],
      },
    }))
  }, [])

  const togglePlatform = useCallback((platform) => {
    setRawState((s) => ({
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
    setRawState((s) => {
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
    setRawState((s) => ({
      ...s,
      hashtags: s.hashtags.filter((h) => h.id !== id),
    }))
  }, [])

  const toggleHashtagPlatform = useCallback((id, platform) => {
    setRawState((s) => ({
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
    setRawState((s) => ({ ...s, publishMode }))
  }, [])

  const setScheduledAt = useCallback((scheduledAt) => {
    setRawState((s) => ({ ...s, scheduledAt }))
  }, [])

  const setTimezone = useCallback((timezone) => {
    setRawState((s) => ({ ...s, timezone }))
  }, [])

  const setScheduleByDay = useCallback((scheduleByDay) => {
    setRawState((s) => ({ ...s, scheduleByDay }))
  }, [])

  const setScheduleStartDate = useCallback((scheduleStartDate) => {
    setRawState((s) => ({ ...s, scheduleStartDate }))
  }, [])

  const setScheduleDayNum = useCallback((scheduleDayNum) => {
    setRawState((s) => ({
      ...s,
      scheduleDayNum: Math.max(1, Number(scheduleDayNum) || 1),
    }))
  }, [])

  const setPoll = useCallback((poll) => {
    setRawState((s) => ({ ...s, poll: { ...s.poll, ...poll } }))
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
    setRawState(draftToComposerState(draft))
    setEditingDraftId(draft.id)
  }, [])

  const resetComposer = useCallback(() => {
    setRawState((s) => {
      revokeMediaItems(s.mediaItems)
      return {
        ...INITIAL_STATE,
        timezone: s.timezone,
        scheduleStartDate: getDefaultBulkStartDate(),
      }
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
    addMediaFiles,
    removeMedia,
    setActiveMedia,
    clearMedia,
    setCropHint,
    replaceActiveMedia,
    toggleImageVisibility,
    togglePlatform,
    addHashtag,
    removeHashtag,
    toggleHashtagPlatform,
    setPublishMode,
    setScheduledAt,
    setTimezone,
    setScheduleByDay,
    setScheduleStartDate,
    setScheduleDayNum,
    setPoll,
    hashtagCounts,
    getBodyForPlatform,
    getFullLength,
  }
}
