export default function Toast({ toast, onDismiss }) {
  if (!toast) return null

  return (
    <div
      className={`animate-toast-in fixed bottom-6 right-6 z-[90] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl ${
        toast.type === 'error'
          ? 'border-red-500/25 bg-red-950/80 text-red-50'
          : 'border-emerald-500/25 bg-emerald-950/80 text-emerald-50'
      }`}
      role="status"
    >
      {toast.type !== 'error' && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/25">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button type="button" onClick={onDismiss} className="text-white/50 hover:text-white" aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
