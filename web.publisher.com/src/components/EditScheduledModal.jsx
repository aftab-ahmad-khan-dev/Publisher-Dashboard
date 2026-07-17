import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import DateTimePicker from './DateTimePicker'
import PlatformIcon from './PlatformIcon'
import ImageEditModal from './ImageEditModal'
import { PLATFORM_META, PLATFORM_ORDER } from '../lib/constants'
import { toDatetimeLocalValue } from '../lib/scheduleUtils'
import { useScheduledImageUrl, ScheduledImagePlaceholder } from '../lib/scheduledImage.jsx'

/**
 * Edit a scheduled post's time, body, platforms, and image. `onSave` receives
 * { body, platforms, scheduledAt, timezone, imageFile?, removeImage? } and may
 * be async; the dialog stays open with a busy state until it resolves.
 */
export default function EditScheduledModal({ open, item, onClose, onSave }) {
  const [body, setBody] = useState('')
  const [platforms, setPlatforms] = useState([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [newPreviewUrl, setNewPreviewUrl] = useState(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const fileInputRef = useRef(null)
  const [seededId, setSeededId] = useState(null)

  const { url: existingUrl, missing: existingMissing } = useScheduledImageUrl(
    open && item && !imageFile && !imageRemoved ? item : null,
  )

  useEffect(() => {
    if (!newPreviewUrl) return undefined
    return () => URL.revokeObjectURL(newPreviewUrl)
  }, [newPreviewUrl])

  if (open && item && seededId !== item.id) {
    setSeededId(item.id)
    setBody(item.body || '')
    setPlatforms(Array.isArray(item.platforms) ? item.platforms : [])
    setScheduledAt(toDatetimeLocalValue(item.scheduledAt))
    setImageFile(null)
    setNewPreviewUrl(null)
    setImageRemoved(false)
    setEditOpen(false)
    setError('')
  }

  const displayUrl = imageRemoved ? null : newPreviewUrl || existingUrl
  const showMissing = !displayUrl && (imageRemoved ? false : existingMissing)

  const togglePlatform = (key) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    )
  }

  const handlePickImage = (fileList) => {
    const file = fileList?.[0]
    if (!file?.type?.startsWith('image/')) {
      setError('Choose a JPG, PNG, GIF, or WEBP image.')
      return
    }
    setError('')
    setImageRemoved(false)
    setImageFile(file)
    setNewPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl)
    setNewPreviewUrl(null)
    setImageRemoved(true)
    setEditOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openImageEditor = async () => {
    if (imageFile && newPreviewUrl) {
      setEditOpen(true)
      return
    }
    if (!displayUrl) {
      setError('Add or replace an image before editing.')
      return
    }
    setEditBusy(true)
    setError('')
    try {
      const res = await fetch(displayUrl)
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) {
        throw new Error('Not an image')
      }
      const ext = blob.type.split('/')[1] || 'jpg'
      const file = new File([blob], `scheduled-${item?.id || 'image'}.${ext}`, {
        type: blob.type || 'image/jpeg',
      })
      setImageRemoved(false)
      setImageFile(file)
      setNewPreviewUrl(URL.createObjectURL(file))
      setEditOpen(true)
    } catch {
      setError('Could not load image for editing. Try Replace image first.')
    } finally {
      setEditBusy(false)
    }
  }

  const handleSave = async () => {
    if (!body.trim()) {
      setError('Post body is required.')
      return
    }
    if (!platforms.length) {
      setError('Select at least one platform.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const result = await onSave?.({
        body,
        platforms,
        scheduledAt,
        timezone: item?.timezone,
        imageFile: imageFile || undefined,
        removeImage: imageRemoved && !imageFile,
      })
      if (result && result.ok === false) {
        setError(result.error || 'Could not update the post.')
        return
      }
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Edit scheduled post"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary px-5 py-2.5"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="field-label">Post</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-400/50"
            placeholder="What do you want to share?"
          />
        </div>

        <div>
          <label className="field-label">Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => handlePickImage(e.target.files)}
          />
          {displayUrl ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <img src={displayUrl} alt="" className="max-h-48 w-full object-cover" />
            </div>
          ) : showMissing ? (
            <ScheduledImagePlaceholder className="py-6" />
          ) : (
            <p className="text-xs text-slate-500">No image attached.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={busy}
            >
              {displayUrl || showMissing ? 'Replace image' : 'Add image'}
            </button>
            {(displayUrl || showMissing) && (
              <>
                <button
                  type="button"
                  onClick={openImageEditor}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 disabled:opacity-50"
                  disabled={busy || editBusy || showMissing}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z"
                    />
                  </svg>
                  {editBusy ? 'Loading…' : 'Edit image'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/25 hover:bg-rose-500/10"
                  disabled={busy}
                >
                  Remove image
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="field-label">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_ORDER.map((key) => {
              const active = platforms.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'border-indigo-400/50 bg-indigo-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                  }`}
                >
                  <PlatformIcon platform={key} size="xs" />
                  {PLATFORM_META[key].label}
                </button>
              )
            })}
          </div>
        </div>

        <DateTimePicker
          value={scheduledAt}
          onChange={setScheduledAt}
          minDate={toDatetimeLocalValue(new Date())}
          timezone={item?.timezone}
        />

        {error && <p className="text-xs font-medium text-rose-400">{error}</p>}
      </div>

      {editOpen && imageFile && newPreviewUrl && (
        <ImageEditModal
          file={imageFile}
          previewUrl={newPreviewUrl}
          onClose={() => setEditOpen(false)}
          onApply={(nextFile) => {
            setImageRemoved(false)
            setImageFile(nextFile)
            setNewPreviewUrl(URL.createObjectURL(nextFile))
            setEditOpen(false)
          }}
        />
      )}
    </Modal>
  )
}
