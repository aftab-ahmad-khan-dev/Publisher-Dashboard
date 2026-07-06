import { useAppData } from '../contexts/AppDataContext'

const PHASE_LABELS = {
  compress: 'Preparing',
  upload: 'Uploading',
  schedule: 'Scheduling',
  publish: 'Publishing',
}

const PHASE_TITLES = {
  compress: 'Preparing files',
  upload: 'Uploading files',
  schedule: 'Scheduling posts',
  publish: 'Publishing post',
}

function SpinnerRing({ children }) {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg
        className="absolute inset-0 h-full w-full -rotate-90 animate-spin-slow text-violet-500/30"
        viewBox="0 0 36 36"
        aria-hidden
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="94"
          strokeLinecap="round"
        />
      </svg>
      {children}
    </div>
  )
}

function DetailedProgressOverlay({ uploadProgress }) {
  const {
    phase = 'upload',
    percent = 0,
    label,
    current,
    total,
    fileName,
  } = uploadProgress

  const phaseLabel = PHASE_LABELS[phase] || 'Processing'
  const phaseTitle = PHASE_TITLES[phase] || 'Processing files'
  const detail =
    label ||
    (total > 0 && current
      ? `${phaseLabel} file ${current} of ${total}`
      : `${phaseLabel}…`)

  const clamped = Math.min(100, Math.max(0, Math.round(percent)))

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#06080f]/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
      aria-busy="true"
    >
      <div className="card-premium mx-4 w-full max-w-sm p-6">
        <div className="flex items-center gap-3">
          <SpinnerRing>
            <span className="font-display text-sm font-bold text-violet-300">{clamped}%</span>
          </SpinnerRing>
          <div className="min-w-0 flex-1">
            <p id="upload-progress-title" className="text-sm font-semibold text-white">
              {phaseTitle}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{detail}</p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="upload-progress-bar h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400 transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>

        {fileName && (
          <p className="mt-3 truncate text-center text-[10px] text-slate-500">{fileName}</p>
        )}

        <p className="mt-3 text-center text-[10px] text-slate-600">
          Please keep this tab open until processing finishes.
        </p>
      </div>
    </div>
  )
}

function GenericProcessOverlay({ message }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#06080f]/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="process-overlay-title"
      aria-busy="true"
    >
      <div className="card-premium mx-4 w-full max-w-sm p-6">
        <div className="flex items-center gap-3">
          <SpinnerRing>
            <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
          </SpinnerRing>
          <div className="min-w-0 flex-1">
            <p id="process-overlay-title" className="text-sm font-semibold text-white">
              Working…
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{message}</p>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-slate-600">
          Please keep this tab open until processing finishes.
        </p>
      </div>
    </div>
  )
}

export default function UploadProgressOverlay() {
  const { uploadProgress, processingLabel } = useAppData()

  if (uploadProgress) {
    return <DetailedProgressOverlay uploadProgress={uploadProgress} />
  }

  if (!processingLabel) return null

  return <GenericProcessOverlay message={processingLabel} />
}
