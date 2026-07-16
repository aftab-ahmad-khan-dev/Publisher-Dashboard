import { useRef, useState, useCallback, useMemo } from 'react'
import { CROP_HINTS, getCropAspectRatio } from '../hooks/usePostState'
import { IMAGE_VISIBILITY_PLATFORMS, PLATFORM_META, MAX_UPLOAD_IMAGES } from '../lib/constants'
import PlatformIcon from './PlatformIcon'
import ImageEditModal from './ImageEditModal'

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4'

function MediaThumb({ item, selected, onSelect, onRemove }) {
  const label = item.index ?? '?'
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`group relative aspect-square overflow-hidden rounded-lg ring-2 transition-all ${
        selected
          ? 'ring-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
          : 'ring-white/10 hover:ring-white/25'
      }`}
    >
      {item.type === 'video' ? (
        <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
      ) : (
        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
      )}
      <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/70 px-1 text-[10px] font-bold text-white">
        #{label}
      </span>
      {selected && (
        <span className="absolute bottom-1 left-1 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          Active
        </span>
      )}
      {item.type === 'video' && (
        <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white">
          MP4
        </span>
      )}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onRemove(item.id)
          }
        }}
        className="absolute right-1 bottom-1 rounded-full bg-black/75 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove"
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    </button>
  )
}

function MediaPlatformChip({ platform, imageOn, publishOn, onToggle }) {
  const meta = PLATFORM_META[platform]
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${meta?.label || platform}: ${imageOn ? 'include image' : 'text only'}`}
      className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 ring-1 transition-all ${
        imageOn
          ? 'bg-indigo-500/12 ring-indigo-500/35 shadow-sm shadow-indigo-500/10'
          : 'bg-white/[0.03] ring-white/[0.08] opacity-55 hover:opacity-80'
      } ${!publishOn ? 'opacity-40' : ''}`}
    >
      <PlatformIcon
        platform={platform}
        size="xs"
        className={`!ring-1 ${imageOn ? '' : 'grayscale'}`}
      />
      <span className="text-[10px] font-semibold text-slate-200">{meta?.short || platform}</span>
      {imageOn && (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500/30 text-[8px] text-indigo-200">
          ✓
        </span>
      )}
    </button>
  )
}

export default function ImageUploader({
  mediaItems = [],
  activeMediaId,
  imagePreviewUrl,
  imageType,
  image,
  cropHint,
  imageVisibility,
  platforms = {},
  addMediaFiles,
  removeMedia,
  setActiveMedia,
  clearMedia,
  setCropHint,
  toggleImageVisibility,
  replaceActiveMedia,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [limitHint, setLimitHint] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const atLimit = mediaItems.length >= MAX_UPLOAD_IMAGES
  const remaining = MAX_UPLOAD_IMAGES - mediaItems.length

  const sortedItems = useMemo(
    () => [...mediaItems].sort((a, b) => (a.index ?? 9999) - (b.index ?? 9999)),
    [mediaItems],
  )

  const handleFiles = useCallback(
    (files) => {
      const incoming = [...(files || [])].filter(
        (f) => f.type.startsWith('image/') || f.type === 'video/mp4',
      )
      if (!incoming.length) return
      if (mediaItems.length + incoming.length > MAX_UPLOAD_IMAGES) {
        setLimitHint(`Maximum ${MAX_UPLOAD_IMAGES} files — extra files were skipped.`)
        setTimeout(() => setLimitHint(''), 4000)
      } else {
        setLimitHint('')
      }
      addMediaFiles(files)
    },
    [addMediaFiles, mediaItems.length],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (atLimit) {
      setLimitHint(`Maximum ${MAX_UPLOAD_IMAGES} files reached. Remove some to add more.`)
      setTimeout(() => setLimitHint(''), 4000)
      return
    }
    handleFiles(e.dataTransfer.files)
  }

  const ratio = useMemo(() => getCropAspectRatio(cropHint, '1 / 1'), [cropHint])
  const isOriginal = cropHint === 'original'

  const activeIndex = sortedItems.findIndex((m) => m.id === activeMediaId)

  return (
    <div className="composer-section space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label className="composer-section-title mb-0">Media attachment</label>
        {mediaItems.length > 0 && (
          <span className="text-[11px] text-slate-500">
            {mediaItems.length} / {MAX_UPLOAD_IMAGES}
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !atLimit) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!atLimit) setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
        }}
        onDrop={onDrop}
        onClick={() => {
          if (!atLimit) inputRef.current?.click()
        }}
        className={`upload-dropzone ${
          atLimit ? 'upload-dropzone--disabled' : ''
        } ${dragOver ? 'upload-dropzone--active' : ''}`}
      >
        <div className="upload-dropzone__icon mb-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-200">
          {dragOver ? 'Drop to upload' : 'Drop images here or click to browse'}
        </p>
        <p className="mt-1 text-center text-[11px] text-slate-500">
          Select multiple · JPG, PNG, GIF, WEBP, MP4 · up to {MAX_UPLOAD_IMAGES} files
        </p>
        {!atLimit && remaining < MAX_UPLOAD_IMAGES && mediaItems.length > 0 && (
          <p className="mt-1.5 text-[10px] font-medium text-indigo-400/90">
            {remaining} slot{remaining === 1 ? '' : 's'} left
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={atLimit}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {limitHint && (
        <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-400/95 ring-1 ring-amber-500/20">
          {limitHint}
        </p>
      )}

      {mediaItems.length > 0 && (
        <>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {sortedItems.map((item) => (
              <li key={item.id}>
                <MediaThumb
                  item={item}
                  selected={item.id === activeMediaId}
                  onSelect={setActiveMedia}
                  onRemove={removeMedia}
                />
              </li>
            ))}
          </ul>

          {imagePreviewUrl && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Previewing image #{sortedItems[activeIndex]?.index ?? activeIndex + 1} of{' '}
                {mediaItems.length} — click a thumbnail to preview
              </p>
              <div
                className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/40 ${
                  isOriginal ? 'flex min-h-[8rem] max-h-96 items-center justify-center' : ''
                }`}
                style={ratio ? { aspectRatio: ratio } : undefined}
              >
                {imageType === 'video' ? (
                  <video
                    src={imagePreviewUrl}
                    className={`h-full w-full ${isOriginal ? 'object-contain' : 'object-cover'}`}
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={imagePreviewUrl}
                    alt="Upload preview"
                    className={`w-full ${isOriginal ? 'max-h-96 object-contain' : 'h-full object-cover'}`}
                  />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80"
                >
                  Clear all
                </button>
                {imageType !== 'video' && replaceActiveMedia && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="absolute top-2 left-2 rounded-full bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {CROP_HINTS.map((hint) => (
                  <button
                    key={hint.id}
                    type="button"
                    onClick={() => setCropHint(hint.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      cropHint === hint.id
                        ? 'bg-white/15 text-white ring-1 ring-white/20'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {hint.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Include image on
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {IMAGE_VISIBILITY_PLATFORMS.filter((p) => imageVisibility[p]).length} /{' '}
                    {IMAGE_VISIBILITY_PLATFORMS.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_VISIBILITY_PLATFORMS.map((key) => (
                    <MediaPlatformChip
                      key={key}
                      platform={key}
                      imageOn={imageVisibility[key]}
                      publishOn={platforms[key]}
                      onToggle={() => toggleImageVisibility(key)}
                    />
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Tap a platform icon to include or exclude this image. Dimmed icons are turned off
                  in the platform list above.
                </p>
              </div>
              {image && (
                <p className="text-xs text-slate-500 truncate">
                  {image.name} · {(image.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
          )}
        </>
      )}

      {editOpen && imagePreviewUrl && imageType !== 'video' && (
        <ImageEditModal
          file={image}
          previewUrl={imagePreviewUrl}
          onClose={() => setEditOpen(false)}
          onApply={(nextFile) => replaceActiveMedia?.(nextFile)}
        />
      )}
    </div>
  )
}
