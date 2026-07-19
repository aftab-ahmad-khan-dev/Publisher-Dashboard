import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  PIPELINE_STAGES,
  formatDate,
  formatMoney,
  leakLabel,
} from '../../lib/salesConstants'

function DragHandle(props) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-600 hover:bg-white/[0.06] hover:text-slate-300 active:cursor-grabbing"
      aria-label="Drag card"
      {...props}
    >
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="5" cy="4" r="1.2" />
        <circle cx="11" cy="4" r="1.2" />
        <circle cx="5" cy="8" r="1.2" />
        <circle cx="11" cy="8" r="1.2" />
        <circle cx="5" cy="12" r="1.2" />
        <circle cx="11" cy="12" r="1.2" />
      </svg>
    </button>
  )
}

function LeadCard({ lead, onOpen, dragProps, overlay }) {
  const leaks = leakLabel(lead.leakFlags)
  const style = dragProps?.style
  const setNodeRef = dragProps?.setNodeRef
  const isDragging = dragProps?.isDragging
  const listeners = dragProps?.listeners
  const attributes = dragProps?.attributes

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border transition ${
        lead.hasLeak
          ? 'border-rose-500/45 bg-gradient-to-br from-rose-500/[0.1] to-transparent'
          : 'border-white/[0.08] bg-[#0c0e16] hover:border-white/[0.14]'
      } ${isDragging ? 'opacity-30' : ''} ${
        overlay ? 'scale-[1.02] shadow-2xl shadow-black/50 ring-1 ring-indigo-500/30' : ''
      }`}
    >
      <div className="flex gap-1 p-2.5">
        {!overlay ? (
          <DragHandle {...attributes} {...listeners} />
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onOpen?.(lead)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {lead.name || lead.email || 'Untitled'}
              </p>
              {lead.company ? (
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{lead.company}</p>
              ) : null}
            </div>
            {lead.totalDealValue > 0 ? (
              <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-300">
                {formatMoney(lead.totalDealValue)}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {lead.setterName ? (
              <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">
                S · {lead.setterName}
              </span>
            ) : null}
            {lead.closerName ? (
              <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
                C · {lead.closerName}
              </span>
            ) : null}
            {lead.source ? (
              <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                {lead.source}
              </span>
            ) : null}
          </div>

          {(lead.meetingDateAt || lead.lastTouchAt) && (
            <p className="mt-2 text-[10px] tabular-nums text-slate-600">
              {lead.meetingDateAt
                ? `Meet ${formatDate(lead.meetingDateAt)}`
                : `Touch ${formatDate(lead.lastTouchAt)}`}
            </p>
          )}

          {leaks.length ? (
            <div className="mt-2 space-y-0.5 border-t border-rose-500/20 pt-2">
              {leaks.map((l) => (
                <p key={l} className="text-[10px] font-semibold text-rose-400">
                  {l}
                </p>
              ))}
            </div>
          ) : null}
        </button>
      </div>
    </div>
  )
}

function SortableCard({ lead, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { type: 'card', stage: lead.pipelineStage } })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <LeadCard
      lead={lead}
      onOpen={onOpen}
      dragProps={{ attributes, listeners, setNodeRef, style, isDragging }}
    />
  )
}

function Column({ stage, leads, onOpen, onQuickAdd }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stage: stage.id },
  })
  const pipelineValue = leads.reduce((s, l) => s + (Number(l.totalDealValue) || 0), 0)
  const leakCount = leads.filter((l) => l.hasLeak).length

  return (
    <div
      className={`flex w-[280px] shrink-0 flex-col rounded-2xl border transition ${
        isOver
          ? 'border-indigo-400/50 bg-indigo-500/[0.08] shadow-[inset_0_0_0_1px_rgba(129,140,248,0.2)]'
          : 'border-white/[0.06] bg-white/[0.015]'
      }`}
    >
      <div className="sticky top-0 z-10 rounded-t-2xl border-b border-white/[0.05] bg-[#080a12]/95 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: stage.color, boxShadow: `0 0 8px ${stage.color}66` }}
          />
          <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-slate-200">
            {stage.label}
          </h3>
          <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
            {leads.length}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
          <span className="tabular-nums">
            {pipelineValue > 0 ? formatMoney(pipelineValue) : '—'}
          </span>
          {leakCount > 0 ? (
            <span className="font-semibold text-rose-400">{leakCount} leak{leakCount === 1 ? '' : 's'}</span>
          ) : (
            <span className="text-slate-600">Healthy</span>
          )}
        </div>
      </div>

      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-[120px] max-h-[calc(100dvh-17rem)] flex-col gap-2 overflow-y-auto px-2 py-2"
        >
          {leads.map((lead) => (
            <SortableCard key={lead.id} lead={lead} onOpen={onOpen} />
          ))}
          {!leads.length ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] px-3 py-8 text-center">
              <p className="text-[11px] text-slate-600">Drop cards here</p>
            </div>
          ) : null}
        </div>
      </SortableContext>

      {onQuickAdd ? (
        <button
          type="button"
          onClick={() => onQuickAdd(stage.id)}
          className="mx-2 mb-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-[11px] font-medium text-slate-600 transition hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-slate-300"
        >
          + Add lead
        </button>
      ) : null}
    </div>
  )
}

function BoardEmptyState({ importableCount, importing, onImport, onCreate }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">Your pipeline is empty</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Mail Box meetings don&apos;t appear here automatically. Import them onto the board, or
        create a lead manually — every downstream metric comes from these cards.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {importableCount > 0 ? (
          <button
            type="button"
            disabled={importing}
            onClick={onImport}
            className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {importing
              ? 'Importing…'
              : `Import ${importableCount} meeting${importableCount === 1 ? '' : 's'}`}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.04]"
        >
          + Create lead
        </button>
      </div>
      {importableCount === 0 ? (
        <p className="mt-4 text-[11px] text-slate-600">
          No eligible meetings found. Book or sync meetings in Mail Box first.
        </p>
      ) : null}
    </div>
  )
}

export default function SalesBoard({
  leads,
  onOpenLead,
  onMoveLead,
  onNeedLossReason,
  onQuickAdd,
  onImportMeetings,
  onCreateLead,
  importableCount = 0,
  importing = false,
}) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const byStage = useMemo(() => {
    const map = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, []]))
    for (const lead of leads) {
      const stage = lead.pipelineStage
      if (map[stage]) map[stage].push(lead)
    }
    return map
  }, [leads])

  const totals = useMemo(() => {
    const pipeline = leads
      .filter((l) => !['won', 'lost'].includes(l.pipelineStage))
      .reduce((s, l) => s + (Number(l.totalDealValue) || 0), 0)
    const won = leads
      .filter((l) => l.pipelineStage === 'won')
      .reduce((s, l) => s + (Number(l.totalDealValue) || 0), 0)
    const leaks = leads.filter((l) => l.hasLeak).length
    return { count: leads.length, pipeline, won, leaks }
  }, [leads])

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  const resolveStage = (over) => {
    if (!over) return null
    const id = String(over.id)
    if (PIPELINE_STAGES.some((s) => s.id === id)) return id
    const overLead = leads.find((l) => l.id === id)
    if (overLead) return overLead.pipelineStage
    const stageFromData = over.data?.current?.stage
    if (stageFromData) return stageFromData
    return null
  }

  const handleDragEnd = (event) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const leadId = String(active.id)
    const targetStage = resolveStage(over)
    if (!targetStage || !PIPELINE_STAGES.some((s) => s.id === targetStage)) return

    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.pipelineStage === targetStage) return

    if (targetStage === 'lost' && !lead.lossReason) {
      onNeedLossReason?.(lead, targetStage)
      return
    }
    onMoveLead(leadId, targetStage)
  }

  if (!leads.length) {
    return (
      <BoardEmptyState
        importableCount={importableCount}
        importing={importing}
        onImport={onImportMeetings}
        onCreate={onCreateLead}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-400">
        <span>
          <strong className="tabular-nums text-white">{totals.count}</strong> leads
        </span>
        <span className="h-3 w-px bg-white/[0.08]" />
        <span>
          Pipeline{' '}
          <strong className="tabular-nums text-slate-200">{formatMoney(totals.pipeline)}</strong>
        </span>
        <span className="h-3 w-px bg-white/[0.08]" />
        <span>
          Won{' '}
          <strong className="tabular-nums text-emerald-300">{formatMoney(totals.won)}</strong>
        </span>
        {totals.leaks > 0 ? (
          <>
            <span className="h-3 w-px bg-white/[0.08]" />
            <span className="font-semibold text-rose-400">{totals.leaks} need attention</span>
          </>
        ) : null}
        {importableCount > 0 ? (
          <button
            type="button"
            disabled={importing}
            onClick={onImportMeetings}
            className="ml-auto rounded-md bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/25 disabled:opacity-50"
          >
            {importing ? 'Importing…' : `Import ${importableCount} more`}
          </button>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-3 pt-0.5 [scrollbar-width:thin]">
          {PIPELINE_STAGES.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              leads={byStage[stage.id] || []}
              onOpen={onOpenLead}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeLead ? (
            <div className="w-[256px]">
              <LeadCard lead={activeLead} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
