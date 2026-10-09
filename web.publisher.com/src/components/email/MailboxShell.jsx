import { useEffect, useMemo, useRef } from 'react'

const FOLDERS = [
  {
    id: 'queued',
    label: 'Queued',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    id: 'sent',
    label: 'Sent',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    ),
  },
  {
    id: 'opened',
    label: 'Opened',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    id: 'failed',
    label: 'Failed',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    ),
  },
  {
    id: 'all',
    label: 'All mail',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    ),
  },
  {
    id: 'junk',
    label: 'Junk',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    ),
  },
]

const MEETING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'none', label: 'No meeting' },
  { id: 'invited', label: 'Invited' },
  { id: 'link_clicked', label: 'Clicked' },
  { id: 'scheduled', label: 'Booked' },
]

function folderIcon(path) {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      {path}
    </svg>
  )
}

function initials(name, email) {
  const raw = String(name || email || '?').trim()
  if (!raw) return '?'
  const parts = raw.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return raw.slice(0, 2).toUpperCase()
}

function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function absoluteTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function snippetOf(m) {
  const text = String(m.renderedText || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text) return text.slice(0, 110)
  if (m.company) return m.company
  return m.email || ''
}

function StatusChip({ status }) {
  const styles = {
    queued: 'mail-chip mail-chip--muted',
    sending: 'mail-chip mail-chip--warn',
    sent: 'mail-chip',
    opened: 'mail-chip mail-chip--active',
    clicked: 'mail-chip mail-chip--active',
    failed: 'mail-chip mail-chip--danger',
    cancelled: 'mail-chip mail-chip--muted',
    paused: 'mail-chip mail-chip--warn',
    draft: 'mail-chip mail-chip--muted',
    completed: 'mail-chip mail-chip--active',
    invited: 'mail-chip',
    link_clicked: 'mail-chip mail-chip--active',
    scheduled: 'mail-chip mail-chip--active',
    no_show: 'mail-chip mail-chip--danger',
    none: 'mail-chip mail-chip--muted',
  }
  return (
    <span className={styles[status] || styles.queued}>
      {String(status || '').replace(/_/g, ' ')}
    </span>
  )
}

function CapMeter({ sent = 0, cap = 200 }) {
  const limit = Math.max(1, Number(cap) || 200)
  const used = Math.max(0, Number(sent) || 0)
  const pct = Math.min(100, Math.round((used / limit) * 1000) / 10)
  const full = used >= limit
  return (
    <div className="mail-cap" title="Emails sent in the last 24 hours">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-medium ${full ? 'text-amber-300' : 'text-zinc-500'}`}>
          Daily send
        </span>
        <span className="text-[10px] tabular-nums text-zinc-400">
          {used}/{limit}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-[width] ${full ? 'bg-amber-400' : 'bg-zinc-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Three-pane SaaS mailbox: folders · message list · reader.
 * Keeps existing outbound CRM semantics (queued/sent/opened/failed/junk).
 */
export default function MailboxShell({
  live,
  folder,
  onFolderChange,
  folderCounts = {},
  mailboxQuery,
  onQueryChange,
  mailboxMeetingFilter,
  onMeetingFilterChange,
  selectMode,
  onSelectModeChange,
  exitSelectMode,
  selectedMailIds,
  toggleMailSelect,
  toggleSelectAll,
  allSelected,
  selectedCount,
  runBulkMailbox,
  bulkBusy,
  messages = [],
  selectedId,
  onSelectMessage,
  detail,
  mailboxTotal,
  mailboxPage,
  mailboxTotalPages,
  onPageChange,
  sent24h,
  dailyCap,
  onRefresh,
  onCompose,
  onMoveToJunk,
  onRestore,
  onDeleteForever,
  onOpenPeople,
  onOpenMeetings,
}) {
  const listRef = useRef(null)
  const reading = Boolean(selectedId)
  const showReader = Boolean(selectedId && detail?.recipient)
  const readerLoading = Boolean(selectedId && !detail?.recipient)

  const activeFolder = useMemo(
    () => FOLDERS.find((f) => f.id === folder) || FOLDERS[1],
    [folder],
  )

  const rangeLabel = useMemo(() => {
    if (!mailboxTotal) return '0 messages'
    const pageSize = messages.length || 40
    const from = (mailboxPage - 1) * pageSize + 1
    const to = Math.min(mailboxTotal, from + messages.length - 1)
    return `${from}–${to} of ${mailboxTotal}`
  }, [mailboxTotal, mailboxPage, messages.length])

  // Keyboard: ↑/↓ navigate, Esc clears, R refresh, J junk (when reading)
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return
      }
      if (e.key === 'Escape') {
        if (selectMode) exitSelectMode?.()
        else if (selectedId) onSelectMessage?.(null)
        return
      }
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onRefresh?.()
        return
      }
      if (!messages.length) return
      const idx = messages.findIndex((m) => m.id === selectedId)
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        const next = messages[Math.min(messages.length - 1, Math.max(0, idx) + 1)]
        if (next) onSelectMessage?.(next.id)
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        const prev = messages[Math.max(0, (idx < 0 ? 0 : idx) - 1)]
        if (prev) onSelectMessage?.(prev.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    messages,
    selectedId,
    selectMode,
    exitSelectMode,
    onSelectMessage,
    onRefresh,
  ])

  const recipient = detail?.recipient

  return (
    <div className={`mail-shell ${reading ? 'mail-shell--reading' : ''}`}>
      {/* Folders */}
      <aside className="mail-folders">
        <div className="p-3 pb-2">
          <button type="button" className="btn-primary w-full py-2 text-[13px]" onClick={onCompose}>
            New message
          </button>
        </div>
        <nav className="saas-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {FOLDERS.map((f) => {
            const count = folderCounts[f.id]
            const active = folder === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFolderChange(f.id)}
                className={`mail-folder ${active ? 'mail-folder--active' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {folderIcon(f.icon)}
                  <span className="truncate">{f.label}</span>
                </span>
                {count != null && count > 0 ? (
                  <span className={`mail-folder__count ${active ? 'mail-folder__count--active' : ''}`}>
                    {count > 999 ? '999+' : count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          <CapMeter sent={sent24h} cap={dailyCap} />
        </div>
      </aside>

      {/* Message list */}
      <section className={`mail-list-pane ${reading ? 'mail-list-pane--dim' : ''}`}>
        <div className="mail-toolbar">
          <div className="mail-search">
            <svg className="mail-search__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={mailboxQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={`Search ${activeFolder.label.toLowerCase()}…`}
              className="mail-search__input"
            />
            {mailboxQuery ? (
              <button
                type="button"
                className="mail-search__clear"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
          <div className="mail-toolbar__actions">
            <button
              type="button"
              className="mail-icon-btn"
              title="Refresh (R)"
              onClick={onRefresh}
              disabled={!live}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
            {!selectMode ? (
              <button
                type="button"
                className="btn-secondary h-8 px-2.5 text-[11px]"
                disabled={!messages.length}
                onClick={() => onSelectModeChange(true)}
              >
                Select
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary h-8 px-2.5 text-[11px]"
                onClick={exitSelectMode}
              >
                Done
              </button>
            )}
            <select
              className="mail-folder-select sm:hidden"
              value={folder}
              onChange={(e) => onFolderChange(e.target.value)}
            >
              {FOLDERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                  {folderCounts[f.id] ? ` (${folderCounts[f.id]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mail-filters">
          {MEETING_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onMeetingFilterChange(f.id)}
              className={`mail-filter ${mailboxMeetingFilter === f.id ? 'mail-filter--active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {selectMode ? (
          <div className="mail-bulk-bar">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-zinc-300">
              <input
                type="checkbox"
                checked={allSelected && messages.length > 0}
                onChange={toggleSelectAll}
                disabled={!messages.length}
                className="rounded border-white/20"
              />
              Select all
            </label>
            {selectedCount > 0 ? (
              <span className="text-[11px] text-zinc-500">{selectedCount} selected</span>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-1.5">
              {selectedCount > 0 &&
                (folder === 'junk' ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => runBulkMailbox('restore')}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="btn-danger px-2.5 py-1 text-[11px] disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => runBulkMailbox('delete')}
                    >
                      Delete forever
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-50"
                    disabled={bulkBusy}
                    onClick={() => runBulkMailbox('junk')}
                  >
                    Move to Junk
                  </button>
                ))}
            </div>
          </div>
        ) : null}

        <div ref={listRef} className="saas-scroll mail-list">
          {!live ? (
            <div className="mail-empty">
              <p className="mail-empty__title">API not connected</p>
              <p className="mail-empty__desc">Set VITE_API_BASE_URL to load your mailbox.</p>
            </div>
          ) : null}
          {live && messages.length === 0 ? (
            <div className="mail-empty">
              <p className="mail-empty__title">No messages</p>
              <p className="mail-empty__desc">
                {mailboxQuery || mailboxMeetingFilter !== 'all'
                  ? 'Nothing matches this search or filter.'
                  : `${activeFolder.label} is empty. Compose a campaign to start outreach.`}
              </p>
              {!mailboxQuery && mailboxMeetingFilter === 'all' ? (
                <button type="button" className="btn-primary mt-4 px-3 py-1.5 text-xs" onClick={onCompose}>
                  New message
                </button>
              ) : null}
            </div>
          ) : null}
          {messages.map((m) => {
            const active = selectedId === m.id
            const checked = selectMode && selectedMailIds.has(m.id)
            const failed = m.status === 'failed'
            const pending = m.status === 'queued' || m.status === 'sending'
            return (
              <div
                key={m.id}
                className={`mail-row ${active ? 'mail-row--active' : ''} ${checked ? 'mail-row--checked' : ''} ${
                  failed ? 'mail-row--failed' : ''
                } ${pending ? 'mail-row--pending' : ''}`}
              >
                {selectMode ? (
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={() => toggleMailSelect(m.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mail-row__check"
                  />
                ) : (
                  <span className="mail-row__avatar" aria-hidden>
                    {initials(m.name, m.email)}
                  </span>
                )}
                <button
                  type="button"
                  className="mail-row__body"
                  onClick={() => {
                    if (selectMode) {
                      toggleMailSelect(m.id)
                      return
                    }
                    onSelectMessage(m.id)
                  }}
                >
                  <div className="mail-row__top">
                    <p className="mail-row__name">{m.name || m.email}</p>
                    <time className="mail-row__time" dateTime={m.sentAt || m.createdAt || undefined}>
                      {relativeTime(m.sentAt || m.createdAt || m.updatedAt)}
                    </time>
                  </div>
                  <p className="mail-row__subject">
                    {m.renderedSubject || m.company || 'No subject'}
                  </p>
                  <p className="mail-row__snippet">{snippetOf(m)}</p>
                  <div className="mail-row__meta">
                    <StatusChip status={m.status} />
                    {m.openCount > 0 ? (
                      <span className="mail-meta-stat">{m.openCount} open{m.openCount > 1 ? 's' : ''}</span>
                    ) : null}
                    {m.meetingStatus && m.meetingStatus !== 'none' ? (
                      <StatusChip status={m.meetingStatus} />
                    ) : null}
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        <div className="mail-pager">
          <p className="text-[11px] text-zinc-500">{rangeLabel}</p>
          <div className="flex gap-1">
            <button
              type="button"
              className="btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-40"
              disabled={mailboxPage <= 1}
              onClick={() => onPageChange(Math.max(1, mailboxPage - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-40"
              disabled={mailboxPage >= mailboxTotalPages}
              onClick={() => onPageChange(Math.min(mailboxTotalPages, mailboxPage + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Reader */}
      <section className={`mail-reader ${reading ? 'mail-reader--open' : ''}`}>
        {readerLoading ? (
          <div className="mail-reader__empty">
            <p className="mail-empty__title">Loading message…</p>
            <p className="mail-empty__desc">Fetching full content and tracking.</p>
          </div>
        ) : !showReader ? (
          <div className="mail-reader__empty">
            <div className="mail-reader__empty-icon">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <p className="mail-empty__title">Select a message</p>
            <p className="mail-empty__desc">
              Choose a thread from the list to read outreach, tracking, and meeting context.
            </p>
            <p className="mt-4 text-[10px] text-zinc-600">↑↓ or J/K to navigate · R to refresh · Esc to close</p>
          </div>
        ) : (
          <>
            <header className="mail-reader__header">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="mail-icon-btn lg:hidden"
                  onClick={() => onSelectMessage(null)}
                  aria-label="Back to list"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="mail-reader__avatar">{initials(recipient.name, recipient.email)}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="mail-reader__subject">
                    {recipient.renderedSubject || 'No subject'}
                  </h2>
                  <p className="mail-reader__to">
                    <span className="text-zinc-500">To</span>{' '}
                    <span className="font-medium text-zinc-200">
                      {recipient.name || recipient.email}
                    </span>
                    {recipient.name ? (
                      <span className="text-zinc-500"> · {recipient.email}</span>
                    ) : null}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusChip status={recipient.status} />
                    {recipient.meetingStatus && recipient.meetingStatus !== 'none' ? (
                      <StatusChip status={recipient.meetingStatus} />
                    ) : null}
                    {recipient.company ? (
                      <span className="text-[11px] text-zinc-500">{recipient.company}</span>
                    ) : null}
                    {recipient.location ? (
                      <span className="text-[11px] text-zinc-500">{recipient.location}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mail-reader__actions">
                {recipient.mailboxFolder === 'junk' ? (
                  <>
                    <button type="button" className="btn-secondary px-2.5 py-1.5 text-[11px]" onClick={onRestore}>
                      Move to inbox
                    </button>
                    <button type="button" className="btn-danger px-2.5 py-1.5 text-[11px]" onClick={onDeleteForever}>
                      Delete forever
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-secondary px-2.5 py-1.5 text-[11px]" onClick={onMoveToJunk}>
                    Move to Junk
                  </button>
                )}
                {onOpenPeople ? (
                  <button type="button" className="btn-secondary px-2.5 py-1.5 text-[11px]" onClick={onOpenPeople}>
                    People
                  </button>
                ) : null}
                {onOpenMeetings && recipient.meetingStatus && recipient.meetingStatus !== 'none' ? (
                  <button type="button" className="btn-secondary px-2.5 py-1.5 text-[11px]" onClick={onOpenMeetings}>
                    Meetings
                  </button>
                ) : null}
              </div>
            </header>

            <div className="mail-reader__stats">
              <div>
                <p className="mail-stat__label">Sent</p>
                <p className="mail-stat__value">{absoluteTime(recipient.sentAt)}</p>
              </div>
              <div>
                <p className="mail-stat__label">Opens</p>
                <p className="mail-stat__value">{recipient.openCount || 0}</p>
              </div>
              <div>
                <p className="mail-stat__label">Clicks</p>
                <p className="mail-stat__value">{recipient.clickCount || 0}</p>
              </div>
              {recipient.meetingLink ? (
                <div>
                  <p className="mail-stat__label">Meeting</p>
                  <a
                    href={recipient.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mail-stat__value text-zinc-100 underline-offset-2 hover:underline"
                  >
                    Open link
                  </a>
                </div>
              ) : null}
            </div>

            <div className="saas-scroll mail-reader__body">
              {recipient.renderedHtml ? (
                <div
                  className="mail-html prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: recipient.renderedHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">
                  {recipient.renderedText || 'Content not captured yet.'}
                </pre>
              )}
              {recipient.error ? (
                <p className="mt-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {recipient.error}
                </p>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
