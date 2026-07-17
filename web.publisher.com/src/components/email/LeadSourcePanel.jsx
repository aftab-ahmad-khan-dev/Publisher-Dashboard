import { useCallback, useState } from 'react'
import { importLeadGoogleSheet, uploadLeadWorkbook } from '../../lib/backendApi'
import ToggleSwitch from '../ToggleSwitch'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const b64 = result.includes(',') ? result.split(',')[1] : result
      resolve(b64)
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Lead source: choose Excel file upload OR paste an Excel / Google Sheets link.
 */
export default function LeadSourcePanel({
  onLoaded,
  skipAlreadyEmailed,
  onSkipChange,
  disabled,
}) {
  const [sourceMode, setSourceMode] = useState('file') // 'file' | 'link'
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [meta, setMeta] = useState(null)
  const [selectedSheets, setSelectedSheets] = useState([])

  const applyResult = useCallback(
    (data) => {
      setMeta(data)
      const names = (data.sheets || []).map((s) => s.sheetName)
      setSelectedSheets(names)
      onLoaded?.({
        ...data,
        selectedSheets: names,
        leads: data.leads || [],
      })
    },
    [onLoaded],
  )

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const dataBase64 = await fileToBase64(file)
      const data = await uploadLeadWorkbook({
        dataBase64,
        fileName: file.name,
        skipAlreadyEmailed,
        dedupe: true,
      })
      applyResult(data)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleLink = async () => {
    if (!sheetsUrl.trim()) return
    setBusy(true)
    setError('')
    try {
      const data = await importLeadGoogleSheet({
        url: sheetsUrl.trim(),
        skipAlreadyEmailed,
        dedupe: true,
      })
      applyResult(data)
    } catch (err) {
      setError(err.message || 'Could not import link')
    } finally {
      setBusy(false)
    }
  }

  const toggleSheet = (name) => {
    setSelectedSheets((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
      if (meta) {
        const leads = (meta.leads || []).filter((l) => next.includes(l.sheetName))
        onLoaded?.({ ...meta, selectedSheets: next, leads })
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-white/[0.08] bg-black/20 p-1">
        {[
          { id: 'file', label: 'Excel file' },
          { id: 'link', label: 'Excel / Sheets link' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={busy || disabled}
            onClick={() => {
              setSourceMode(opt.id)
              setError('')
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              sourceMode === opt.id
                ? 'bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/35'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {sourceMode === 'file' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) handleFile(f)
          }}
          className={`rounded-2xl border-2 border-dashed px-5 py-10 text-center transition ${
            dragOver
              ? 'border-indigo-400 bg-indigo-500/15'
              : 'border-white/[0.12] bg-white/[0.02] hover:border-indigo-400/40 hover:bg-indigo-500/[0.04]'
          }`}
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <p className="text-base font-semibold text-white">
            {busy ? 'Parsing workbook…' : 'Drop Excel (.xlsx) here'}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            Or CSV / TSV · all worksheets scanned · headers matched by name
          </p>
          <label className="btn-primary mt-4 inline-flex cursor-pointer px-4 py-2 text-sm">
            Choose Excel file
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={busy || disabled}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4">
          <p className="text-sm font-semibold text-white">Paste a workbook link</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Google Sheets (Anyone with the link), or a public Excel (.xlsx) download link
            (Dropbox / OneDrive / direct file URL).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... or .xlsx link"
              disabled={busy || disabled}
              className="saas-input min-w-0 flex-1 py-2.5"
            />
            <button
              type="button"
              className="btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
              disabled={busy || disabled || !sheetsUrl.trim()}
              onClick={handleLink}
            >
              {busy ? 'Importing…' : 'Import link'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">Skip already emailed</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Rows marked email sent in your sheet
            </p>
          </div>
          <ToggleSwitch
            checked={skipAlreadyEmailed}
            onChange={(v) => onSkipChange?.(v)}
            disabled={busy || disabled}
            showLabels
            onLabel="ON"
            offLabel="OFF"
            accent="emerald"
            size="sm"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {meta?.sheets?.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-200">
              {meta.stats?.leads ?? 0} leads ready · {meta.stats?.skipped ?? 0} skipped ·{' '}
              {meta.stats?.quarantine ?? 0} no email
            </p>
            {meta.source?.fileName && (
              <span className="text-[10px] text-slate-500">{meta.source.fileName}</span>
            )}
          </div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            Worksheets (click to toggle)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {meta.sheets.map((s) => (
              <button
                key={s.sheetName}
                type="button"
                onClick={() => toggleSheet(s.sheetName)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  selectedSheets.includes(s.sheetName)
                    ? 'bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40'
                    : 'bg-white/[0.04] text-slate-500 hover:text-slate-300'
                }`}
              >
                {s.sheetName}
                <span className="ml-1 opacity-70">{s.leadCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
