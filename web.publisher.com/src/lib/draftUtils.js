import { DEFAULT_PLATFORMS, DEFAULT_IMAGE_VISIBILITY } from './constants'
import { DEFAULT_POLL } from './pollUtils'

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
    imageMeta: state.images?.[0]?.file
      ? {
          name: state.images[0].file.name,
          type: state.images[0].file.type,
          size: state.images[0].file.size,
          count: state.images.length,
        }
      : null,
    poll: state.poll
      ? {
          enabled: Boolean(state.poll.enabled),
          question: state.poll.question || '',
          options: [...(state.poll.options || [])],
          allowMultiple: Boolean(state.poll.allowMultiple),
          durationDays: state.poll.durationDays || 3,
        }
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
    // Image binaries aren't persisted in drafts; the user re-attaches on load.
    images: [],
    cropHint: draft.cropHint || 'square',
    imageVisibility: draft.imageVisibility || { ...DEFAULT_IMAGE_VISIBILITY },
    hashtags: draft.hashtags || [],
    platforms: draft.platforms || { ...DEFAULT_PLATFORMS },
    publishMode: draft.publishMode || 'now',
    scheduledAt: draft.scheduledAt || '',
    timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    poll: draft.poll
      ? {
          ...DEFAULT_POLL,
          ...draft.poll,
          options: [...(draft.poll.options || DEFAULT_POLL.options)],
        }
      : { ...DEFAULT_POLL },
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
