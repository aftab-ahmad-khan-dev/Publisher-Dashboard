import { useEffect, useRef, useState } from 'react'

const PRESETS = [
  { id: 'original', label: 'Original', w: 0, h: 0 },
  { id: 'linkedin', label: 'LinkedIn', w: 1200, h: 627 },
  { id: 'ig-square', label: 'IG Square', w: 1080, h: 1080 },
  { id: 'ig-portrait', label: 'IG Portrait', w: 1080, h: 1350 },
  { id: 'fb', label: 'FB Landscape', w: 1200, h: 630 },
  { id: 'threads', label: 'Threads', w: 1080, h: 1080 },
  { id: 'story', label: 'Story', w: 1080, h: 1920 },
]

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Modal to crop / resize / filter an uploaded image before publish.
 */
export default function ImageEditModal({ file, previewUrl, onClose, onApply }) {
  const canvasRef = useRef(null)
  const [preset, setPreset] = useState('original')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturate, setSaturate] = useState(100)
  const [grayscale, setGrayscale] = useState(0)
  const [busy, setBusy] = useState(false)
  const [natural, setNatural] = useState({ w: 0, h: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const img = await loadImage(previewUrl)
        if (cancelled) return
        setNatural({ w: img.naturalWidth, h: img.naturalHeight })
        draw(img)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, preset, brightness, contrast, saturate, grayscale])

  function targetSize() {
    const p = PRESETS.find((x) => x.id === preset) || PRESETS[0]
    if (!p.w || !p.h) return { w: natural.w || 1080, h: natural.h || 1080, cover: false }
    return { w: p.w, h: p.h, cover: true }
  }

  function draw(img) {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const { w, h, cover } = targetSize()
    const outW = Math.max(1, w)
    const outH = Math.max(1, h)
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%)`

    if (!cover) {
      ctx.drawImage(img, 0, 0, outW, outH)
      return
    }

    const scale = Math.max(outW / img.naturalWidth, outH / img.naturalHeight)
    const sw = outW / scale
    const sh = outH / scale
    const sx = (img.naturalWidth - sw) / 2
    const sy = (img.naturalHeight - sh) / 2
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
  }

  const handleApply = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setBusy(true)
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) throw new Error('Could not export image')
      const name = (file?.name || 'edited.jpg').replace(/\.\w+$/, '') + '-edited.jpg'
      const next = new File([blob], name, { type: 'image/jpeg' })
      onApply(next)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1220] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-display text-base font-bold text-white">Edit image</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex justify-center rounded-xl bg-black/40 p-3">
            <canvas ref={canvasRef} className="max-h-[42vh] max-w-full rounded-lg" />
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Size / crop</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    preset === p.id
                      ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-500/40'
                      : 'bg-white/[0.05] text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                  {p.w ? ` (${p.w}×${p.h})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['Brightness', brightness, setBrightness, 50, 150],
              ['Contrast', contrast, setContrast, 50, 150],
              ['Saturate', saturate, setSaturate, 0, 200],
              ['Grayscale', grayscale, setGrayscale, 0, 100],
            ].map(([label, value, setValue, min, max]) => (
              <label key={label} className="text-xs text-slate-400">
                {label}: {value}
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleApply}
            className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
