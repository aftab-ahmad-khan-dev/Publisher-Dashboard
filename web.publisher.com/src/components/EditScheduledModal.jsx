import { useState } from 'react'
import Modal from './Modal'
import DateTimePicker from './DateTimePicker'
import PlatformIcon from './PlatformIcon'
import { PLATFORM_META } from '../lib/constants'
import { toDatetimeLocalValue } from '../lib/scheduleUtils'

const PLATFORM_KEYS = Object.keys(PLATFORM_META)

/**
 * Edit a scheduled post's time, body, and platforms. `onSave` receives
 * { body, platforms, scheduledAt (datetime-local string), timezone } and may be
 * async; the dialog stays open with a busy state until it resolves.
 */
export default function EditScheduledModal({ open, item, onClose, onSave }) {
  const [body, setBody] = useState('')
  const [platforms, setPlatforms] = useState([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Re-seed local state whenever a different post is opened for editing.
  const [seededId, setSeededId] = useState(null)

  if (open && item && seededId !== item.id) {
    setSeededId(item.id)
    setBody(item.body || '')
    setPlatforms(Array.isArray(item.platforms) ? item.platforms : [])
    setScheduledAt(toDatetimeLocalValue(item.scheduledAt))
    setError('')
  }

  const togglePlatform = (key) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    )
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
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-violet-400/50"
            placeholder="What do you want to share?"
          />
        </div>

        <div>
          <label className="field-label">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_KEYS.map((key) => {
              const active = platforms.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'border-violet-400/50 bg-violet-500/15 text-white'
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
    </Modal>
  )
}
