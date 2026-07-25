import SplashScreen from './SplashScreen'
import { useAppData } from '../contexts/AppDataContext'
import { useLocation } from 'react-router-dom'

const PHASE_TITLES = {
  compress: 'Preparing files…',
  upload: 'Uploading files…',
  schedule: 'Scheduling posts…',
  publish: 'Publishing…',
}

const MARKETING_PATHS = ['/', '/pricing', '/products', '/about', '/privacy', '/terms', '/contact']

/** Compact corner chip — not a full-screen blocker */
function SoftProcessChip({ message }) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[180] flex max-w-xs items-center gap-2.5 rounded-xl border border-white/10 bg-[#0c0e16]/95 px-3.5 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-indigo-400" />
      <p className="truncate text-xs font-medium text-slate-200">{message}</p>
    </div>
  )
}

export default function UploadProgressOverlay() {
  const { pathname } = useLocation()
  const isMarketing = MARKETING_PATHS.includes(pathname)
  const isAuth = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')
  const { uploadProgress, processingLabel, blockingLoading } = useAppData()

  // Never cover marketing or auth pages with process overlays
  if (isMarketing || isAuth) return null

  if (uploadProgress) {
    const {
      phase = 'upload',
      percent = 0,
      label,
      current,
      total,
      fileName,
    } = uploadProgress
    const phaseTitle = PHASE_TITLES[phase] || 'Processing…'
    const detail =
      label ||
      (total > 0 && current ? `${phaseTitle.replace('…', '')} ${current} of ${total}` : phaseTitle)
    const clamped = Math.min(100, Math.max(0, Math.round(percent)))

    return (
      <SplashScreen
        visible
        message={fileName ? `${detail} · ${fileName}` : detail}
        subtitle="Keep this tab open until processing finishes"
        progress={clamped}
      />
    )
  }

  if (blockingLoading && processingLabel) {
    return (
      <SplashScreen
        visible
        message={processingLabel}
        subtitle="Working on your request"
      />
    )
  }

  if (processingLabel) {
    return <SoftProcessChip message={processingLabel} />
  }

  return null
}
