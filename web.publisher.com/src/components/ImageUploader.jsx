import { useRef, useState } from 'react'
import { CROP_HINTS, MAX_IMAGES } from '../hooks/usePostState'

const ACCEPT = 'image/jpeg,image/png,image/gif,video/mp4'

export default function ImageUploader({
  images,
  cropHint,
  imageVisibility,
  addImages,
  removeImage,
  moveImage,
  setCropHint,
  toggleImageVisibility,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const atLimit = images.length >= MAX_IMAGES

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addImages(e.dataTransfer.files)
  }

  const ratio =
    CROP_HINTS.find((c) => c.id === cropHint)?.ratio ?? '1 / 1'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Media attachment
        </label>
        {images.length > 0 && (
          <span className="text-[11px] text-slate-500">
            {images.length} / {MAX_IMAGES}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          addImages(e.target.files)
          e.target.value = ''
        }}
      />

      {images.length === 0 ? (
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
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG, GIF, MP4 · up to {MAX_IMAGES} for a carousel
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              if (!atLimit) setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`grid grid-cols-3 gap-2 rounded-xl border-2 border-dashed p-2 transition-colors sm:grid-cols-4 ${
              dragOver ? 'border-[#1877F2] bg-[#1877F2]/10' : 'border-transparent'
            }`}
          >
            {images.map((img, index) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-lg border border-white/10 bg-black/40"
                style={{ aspectRatio: ratio }}
              >
                {img.type === 'video' ? (
                  <video src={img.previewUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={img.previewUrl} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                )}

                <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveImage(img.id, -1)}
                    disabled={index === 0}
                    className="rounded bg-black/60 px-1.5 py-0.5 text-white hover:bg-black/80 disabled:opacity-30"
                    aria-label="Move left"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(img.id, 1)}
                    disabled={index === images.length - 1}
                    className="rounded bg-black/60 px-1.5 py-0.5 text-white hover:bg-black/80 disabled:opacity-30"
                    aria-label="Move right"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {img.type === 'video' && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white group-hover:opacity-0">
                    MP4
                  </span>
                )}
              </div>
            ))}

            {!atLimit && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/30 text-slate-500 transition-colors hover:border-slate-500 hover:bg-slate-800/40"
                style={{ aspectRatio: ratio }}
                aria-label="Add more media"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="mt-1 text-[10px]">Add</span>
              </button>
            )}
          </div>

          {images.length > 1 && (
            <p className="text-[11px] text-slate-500">
              Posts as a carousel. First image leads; drag-free reorder with the arrows.
            </p>
          )}

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
        </div>
      )}
    </div>
  )
}
