import { useRef, useState, useCallback } from 'react'
import { CROP_HINTS } from '../hooks/usePostState'

const ACCEPT = 'image/jpeg,image/png,image/gif,video/mp4'

export default function ImageUploader({
  image,
  imagePreviewUrl,
  imageType,
  cropHint,
  imageVisibility,
  setImage,
  setCropHint,
  toggleImageVisibility,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0]
      if (!file) return
      const valid =
        file.type.startsWith('image/') || file.type === 'video/mp4'
      if (valid) setImage(file)
    },
    [setImage],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const ratio =
    CROP_HINTS.find((c) => c.id === cropHint)?.ratio ?? '1 / 1'

  return (
    <div className="space-y-4">
      <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Media attachment
      </label>

      {!imagePreviewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            dragOver
              ? 'border-[#1877F2] bg-[#1877F2]/10'
              : 'border-slate-600 bg-slate-900/30 hover:border-slate-500 hover:bg-slate-800/40'
          }`}
        >
          <svg
            className="mb-3 h-10 w-10 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium text-slate-300">
            Drop media here or click to upload
          </p>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG, GIF, MP4</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
            style={{ aspectRatio: ratio }}
          >
            {imageType === 'video' ? (
              <video
                src={imagePreviewUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={imagePreviewUrl}
                alt="Upload preview"
                className="h-full w-full object-cover"
              />
            )}
            {imageType === 'video' && (
              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                MP4
              </span>
            )}
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
              aria-label="Remove media"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-slate-500">Show on:</span>
            {[
              { key: 'instagram', label: 'Meta (IG)', color: 'from-[#E1306C] to-[#F77737]' },
              { key: 'facebook', label: 'Meta (FB)', color: 'bg-[#1877F2]' },
              { key: 'linkedin', label: 'LinkedIn', color: 'bg-[#0A66C2]' },
            ].map(({ key, label, color }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={imageVisibility[key]}
                  onChange={() => toggleImageVisibility(key)}
                  className="sr-only"
                />
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                    imageVisibility[key]
                      ? color.startsWith('from')
                        ? 'instagram-gradient border-transparent text-white'
                        : `${color} border-transparent text-white`
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {imageVisibility[key] && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M10.28 2.28L4.5 8.06 1.72 5.28.28 6.72l4.22 4.22 6.5-6.5z" />
                    </svg>
                  )}
                </span>
                {label}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {image?.name} · {(image?.size / 1024).toFixed(0)} KB
          </p>
        </div>
      )}
    </div>
  )
}
