import { useEffect, useState } from 'react'
import { getApiBaseUrl } from './apiBaseUrl'

async function getClerkToken() {
  try {
    if (typeof window !== 'undefined' && window.Clerk?.session) {
      return await window.Clerk.session.getToken()
    }
  } catch {
    /* not signed in */
  }
  return null
}

/** Resolve a scheduled post image for previews (inline data URL or authenticated API). */
export function useScheduledImageUrl(item) {
  const [url, setUrl] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let revoke
    let cancelled = false

    async function load() {
      if (!item) {
        setUrl(null)
        setMissing(false)
        return
      }

      const inline = item.imagePreview || item.imagePreviewUrl
      if (inline?.startsWith('data:image/')) {
        setUrl(inline)
        setMissing(false)
        return
      }

      if (!item.id) {
        setUrl(null)
        setMissing(Boolean(item.imageMissing))
        return
      }

      const token = await getClerkToken()
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/scheduled/${item.id}/image`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (cancelled) return

      if (!res.ok) {
        setUrl(null)
        setMissing(true)
        return
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      revoke = objectUrl
      setUrl(objectUrl)
      setMissing(false)
    }

    load().catch(() => {
      if (!cancelled) {
        setUrl(null)
        setMissing(true)
      }
    })

    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [item?.id, item?.imagePreview, item?.imagePreviewUrl, item?.imageMissing])

  return { url, missing }
}

export function ScheduledImagePlaceholder({ className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-8 text-center ${className}`}
    >
      <svg className="mb-2 h-8 w-8 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className="text-xs font-medium text-amber-200/90">Image missing</p>
      <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-slate-500">
        Re-upload images via Bulk Upload to restore this post.
      </p>
    </div>
  )
}
