import { useMemo, useState } from 'react'
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  LOSS_REASON_LABELS,
  formatDate,
  formatMoney,
  leakLabel,
} from '../../lib/salesConstants'

const COLUMNS = [
  { key: 'name', label: 'Lead' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'setterName', label: 'Setter' },
  { key: 'closerName', label: 'Closer' },
  { key: 'pipelineStage', label: 'Stage' },
  { key: 'dateCreated', label: 'Created' },
  { key: 'firstContactAt', label: 'First contact' },
  { key: 'meetingDateAt', label: 'Meeting' },
  { key: 'lastTouchAt', label: 'Last touch' },
  { key: 'offerMade', label: 'Offer' },
  { key: 'saleType', label: 'Sale type' },
  { key: 'lossReason', label: 'Loss' },
  { key: 'depositAmount', label: 'Deposit' },
  { key: 'totalDealValue', label: 'Deal' },
  { key: 'cashCollected', label: 'Cash' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'leaks', label: 'Leaks' },
]

function cellValue(lead, key) {
  switch (key) {
    case 'pipelineStage':
      return STAGE_LABELS[lead.pipelineStage] || lead.pipelineStage
    case 'dateCreated':
    case 'firstContactAt':
    case 'meetingDateAt':
    case 'lastTouchAt':
      return formatDate(lead[key])
    case 'offerMade':
      return lead.offerMade ? 'Yes' : 'No'
    case 'saleType':
      return lead.saleType === 'one_call'
        ? '1-Call'
        : lead.saleType === 'follow_up'
          ? 'Follow-Up'
          : '—'
    case 'lossReason':
      return LOSS_REASON_LABELS[lead.lossReason] || '—'
    case 'depositAmount':
    case 'totalDealValue':
    case 'cashCollected':
    case 'earnings':
      return formatMoney(lead[key] || 0)
    case 'leaks':
      return leakLabel(lead.leakFlags).join(', ') || '—'
    case 'email':
      return lead.email?.endsWith('@crm.local') ? '—' : lead.email || '—'
    default:
      return lead[key] || '—'
  }
}

export default function LeadLog({ leads, onOpenLead, onStageChange }) {
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('')
  const [sortKey, setSortKey] = useState('updatedAt')
  const [sortDir, setSortDir] = useState('desc')

  const filtered = useMemo(() => {
    let rows = [...leads]
    if (stage) rows = rows.filter((l) => l.pipelineStage === stage)
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      rows = rows.filter((l) =>
        [l.name, l.company, l.email, l.phone, l.source, l.setterName, l.closerName]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
    }
    rows.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av)
      const bs = String(bv)
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return rows
  }, [leads, q, stage, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search leads…"
          className="min-w-[180px] flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{filtered.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                  <button type="button" onClick={() => toggleSort(col.key)} className="hover:text-slate-300">
                    {col.label}
                    {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className={`border-t border-white/[0.05] hover:bg-white/[0.03] ${
                  lead.hasLeak ? 'bg-rose-500/[0.05]' : ''
                }`}
              >
                {COLUMNS.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-3 py-2 text-slate-300">
                    {col.key === 'name' ? (
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead)}
                        className={`font-medium hover:underline ${
                          lead.hasLeak ? 'text-rose-300' : 'text-white'
                        }`}
                      >
                        {lead.name || lead.email || 'Untitled'}
                      </button>
                    ) : col.key === 'pipelineStage' ? (
                      <select
                        value={lead.pipelineStage}
                        onChange={(e) => onStageChange(lead, e.target.value)}
                        className="rounded border border-white/[0.1] bg-transparent px-1.5 py-1 text-[11px] text-slate-200"
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    ) : col.key === 'leaks' ? (
                      <span className={lead.hasLeak ? 'font-semibold text-rose-400' : ''}>
                        {cellValue(lead, col.key)}
                      </span>
                    ) : (
                      cellValue(lead, col.key)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-slate-600">
                  No leads match these filters
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
