import { useRef, useState, useCallback, useEffect } from 'react'
import { imageIndexFromFilename } from '../lib/bulkParse'
import { MAX_UPLOAD_IMAGES } from '../lib/constants'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export const BULK_IMAGE_MAX = MAX_UPLOAD_IMAGES

function mergeFiles(prev, incoming, max = BULK_IMAGE_MAX) {
  const images = [...incoming].filter((f) => f.type.startsWith('image/'))
  const next = [...prev]
  for (const file of images) {
    if (next.length >= max) break
    const dup = next.findIndex((f) => f.name === file.name && f.size === file.size)
    if (dup >= 0) next[dup] = file
    else next.push(file)
  }
  return next.slice(0, max)
}

function DropThumb({ file, indexLabel, onRemove }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  return (
    <li className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-white/10">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {indexLabel != null && (
        <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-violet-600/90 px-1 text-[10px] font-bold text-white shadow">
          {indexLabel}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label={`Remove ${file.name}`}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <p className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-[9px] text-slate-300">
        {file.name}
      </p>
    </li>
  )
}

export default function BulkImageDropzone({ files, onChange, maxFiles = BULK_IMAGE_MAX }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [limitHint, setLimitHint] = useState('')

  const atLimit = files.length >= maxFiles
  const remaining = maxFiles - files.length

  const addFiles = useCallback(
    (incoming) => {
      const before = files.length
      const next = mergeFiles(files, incoming, maxFiles)
      onChange(next)
      if (before + [...incoming].filter((f) => f.type.startsWith('image/')).length > maxFiles) {
        setLimitHint(`Maximum ${maxFiles} images — extra files were skipped.`)
        setTimeout(() => setLimitHint(''), 4000)
      } else {
        setLimitHint('')
      }
    },
    [files, onChange, maxFiles],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (atLimit) {
      setLimitHint(`Maximum ${maxFiles} images reached. Remove some to add more.`)
      setTimeout(() => setLimitHint(''), 4000)
      return
    }
    addFiles(e.dataTransfer.files)
  }

  const removeAt = (i) => {
    onChange(files.filter((_, j) => j !== i))
  }

  const sortedForGrid = [...files].sort((a, b) => {
    const ia = imageIndexFromFilename(a.name) ?? 9999
    const ib = imageIndexFromFilename(b.name) ?? 9999
    return ia - ib || a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!atLimit) inputRef.current?.click()
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
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-all duration-200 ${
          atLimit ? 'cursor-not-allowed opacity-60' : ''
        } ${
          dragOver
            ? 'border-violet-400 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.2)]'
            : 'border-white/[0.12] bg-gradient-to-b from-white/[0.03] to-transparent hover:border-violet-500/40 hover:bg-violet-500/[0.06]'
        }`}
      >
        <div
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
            dragOver ? 'bg-violet-500/30 text-violet-200' : 'bg-white/[0.05] text-slate-500'
          }`}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
          Up to <span className="text-slate-400">{maxFiles}</span> files · JPG, PNG, WEBP, GIF
        </p>
        <p className="mt-2 text-center text-[10px] text-slate-600">
          Name by index: <span className="text-slate-500">1.jpg</span>,{' '}
          <span className="text-slate-500">2.png</span>, <span className="text-slate-500">post-3.webp</span>
        </p>
        {!atLimit && remaining < maxFiles && files.length > 0 && (
          <p className="mt-2 text-[10px] font-medium text-violet-400/90">{remaining} slot{remaining === 1 ? '' : 's'} left</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={atLimit}
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className={files.length > 0 ? 'font-medium text-slate-300' : 'text-slate-500'}>
          {files.length} / {maxFiles} images
        </span>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-rose-400/90 hover:text-rose-300"
          >
            Clear all
          </button>
        )}
      </div>

      {limitHint && (
        <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-400/95 ring-1 ring-amber-500/20">
          {limitHint}
        </p>
      )}

      {sortedForGrid.length > 0 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {sortedForGrid.map((file) => {
            const realIndex = files.indexOf(file)
            const label = imageIndexFromFilename(file.name)
            return (
              <DropThumb
                key={`${file.name}-${file.size}-${realIndex}`}
                file={file}
                indexLabel={label}
                onRemove={() => removeAt(realIndex)}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
