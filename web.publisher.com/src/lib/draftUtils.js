import { DEFAULT_PLATFORMS, DEFAULT_IMAGE_VISIBILITY } from './constants'

export function draftTitleFromBody(body) {
  const trimmed = body.trim()
  if (!trimmed) return 'Untitled draft'
  return trimmed.length > 56 ? `${trimmed.slice(0, 56)}…` : trimmed
}

export function serializePostState(state, existingId = null) {
  const now = new Date().toISOString()
  return {
    id: existingId || crypto.randomUUID(),
    title: draftTitleFromBody(state.body),
    body: state.body,
    cropHint: state.cropHint,
    imageVisibility: { ...state.imageVisibility },
    hashtags: state.hashtags.map((h) => ({
      id: h.id,
      tag: h.tag,
      platforms: { ...h.platforms },
    })),
    platforms: { ...state.platforms },
    publishMode: state.publishMode,
    scheduledAt: state.scheduledAt || '',
    timezone: state.timezone,
    imageMeta: state.image
      ? { name: state.image.name, type: state.image.type, size: state.image.size }
      : null,
    updatedAt: now,
    createdAt: existingId ? undefined : now,
  }
}

export function mergeDraftSave(drafts, payload, existingId) {
  const entry = {
    ...payload,
    createdAt:
      existingId
        ? drafts.find((d) => d.id === existingId)?.createdAt || payload.updatedAt
        : payload.updatedAt,
  }
  if (existingId) {
    return drafts.map((d) => (d.id === existingId ? { ...d, ...entry, id: existingId } : d))
  }
  return [entry, ...drafts]
}

export function draftToComposerState(draft) {
  return {
    body: draft.body || '',
    image: null,
    imagePreviewUrl: null,
    imageType: null,
    cropHint: draft.cropHint || 'square',
    imageVisibility: draft.imageVisibility || { ...DEFAULT_IMAGE_VISIBILITY },
    hashtags: draft.hashtags || [],
    platforms: draft.platforms || { ...DEFAULT_PLATFORMS },
    publishMode: draft.publishMode || 'now',
    scheduledAt: draft.scheduledAt || '',
    timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }
}

export function formatDraftDate(iso) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}
