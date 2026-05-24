import { useRef, useState, useCallback } from 'react'
import { readRecipientFile } from '../lib/recipientFile'

export default function RecipientCsvUpload({
  onImport,
  onClear,
  fileName,
  recipientCount,
  templateCsv,
  disabled,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = useCallback(
    async (file) => {
      if (!file || disabled) return
      setLoading(true)
      setError('')
      try {
        const { text, fileName: name } = await readRecipientFile(file)
        if (!text.trim()) {
          setError('File is empty')
          return
        }
        onImport(text, name)
      } catch (err) {
        setError(err.message || 'Import failed')
      } finally {
        setLoading(false)
      }
    },
    [onImport, disabled],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
        }}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition-all ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } ${
          dragOver
            ? 'border-violet-400 bg-violet-500/15'
            : 'border-white/[0.12] bg-white/[0.02] hover:border-violet-500/40 hover:bg-violet-500/[0.04]'
        }`}
      >
        <svg className="mb-2 h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium text-slate-200">
          {loading ? 'Reading file…' : dragOver ? 'Drop CSV here' : 'Upload CSV file'}
        </p>
        <p className="mt-1 text-center text-[11px] text-slate-500">
          Drag & drop or click · .csv, .txt, .tsv
        </p>
        <p className="mt-1 text-center text-[10px] text-slate-600">
          email, name, company, niche
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500">
          {fileName ? (
            <>
              <span className="text-emerald-400/90">{fileName}</span>
              {' · '}
              <span className="text-slate-300">{recipientCount} recipients</span>
            </>
          ) : (
            'No file loaded — or paste below'
          )}
        </span>
        <div className="flex gap-2">
          {templateCsv && (
            <button
              type="button"
              className="text-violet-400 hover:text-violet-300"
              onClick={(e) => {
                e.stopPropagation()
                onImport(templateCsv, 'sample-recipients.csv')
              }}
            >
              Load sample
            </button>
          )}
          {fileName && onClear && (
            <button type="button" className="text-slate-500 hover:text-rose-400" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] text-rose-400/95 ring-1 ring-rose-500/20">
          {error}
        </p>
      )}
    </div>
  )
}
