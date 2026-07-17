import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { isLivePublishing } from '../lib/api'
import { isLocalApi } from '../lib/apiBaseUrl'
import { isGmailConfigured, isGmailSendReady } from '../lib/connections'
import {
  createEmailCampaign,
  listEmailCampaigns,
  pauseEmailCampaign,
  resumeEmailCampaign,
  cancelEmailCampaign,
  downloadLeadSourceExport,
  getEmailSettings,
  saveEmailTemplateDraft,
  saveEmailNudgeSettings,
  listEmailTemplates,
  listProcessedEmails,
  listEmailMeetings,
  updateEmailMeeting,
  removeEmailMeetings,
  fetchEmailMailbox,
  fetchEmailMailboxMessage,
  moveMailboxToJunk,
  restoreMailboxFromJunk,
  deleteMailboxForever,
  bulkMailboxAction,
  createCalendarInvite,
  syncEmailCalendar,
  saveCalendarSettings,
  subscribeRealtime,
  sendEmailNudge,
  sendMeetingReminder,
} from '../lib/backendApi'
import { mergeTemplate } from '../lib/emailParse'
import { forceScheduleMeetingHrefs, forceScheduleMeetingText } from '../lib/meetingCta'
import {
  OUTREACH_TEMPLATES,
  PRODUCT_TEMPLATES,
  SIGNATURE,
} from '../lib/emailTemplates'
import LeadSourcePanel from '../components/email/LeadSourcePanel'
import ConfirmDialog from '../components/ConfirmDialog'
import PageShell, { PageScroll } from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import DateTimePicker from '../components/DateTimePicker'
import { toDatetimeLocalValue, datetimeLocalToISO, parseDatetimeLocal } from '../lib/scheduleUtils'

const TABS = [
  { id: 'mailbox', label: 'Mail Box' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'processed', label: 'Processed mail' },
  { id: 'meetings', label: 'Meetings' },
]

const NUDGE_TOOLTIPS = {
  follow_up:
    'Follow Up — reminds them slots are limited. Also auto-sends 24h after Reason if meeting status is still unchanged.',
  final_call:
    'Final Call — last slot + 10% off. Auto-sends after 48h if meeting status stays the same.',
  reason:
    'Reason — asks why they haven’t booked. Auto-sends 36h after Final Call if status is still unchanged.',
  reminder:
    'Reminder — emails the lead that their booked meeting starts in ~10 minutes, with the Meet link. If you don’t send it, it auto-sends in the 10‑min window and notifies you in the app.',
}

const MAILBOX_FOLDERS = [
  { id: 'queued', label: 'Queued' },
  { id: 'sent', label: 'Sent' },
  { id: 'opened', label: 'Opened' },
  { id: 'failed', label: 'Failed' },
  { id: 'all', label: 'All mail' },
  { id: 'junk', label: 'Junk' },
]

const MEETING_STATUSES = [
  { id: 'invited', label: 'Invited' },
  { id: 'link_clicked', label: 'Link clicked' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'no_show', label: 'No show' },
  { id: 'none', label: 'None' },
]

function StatusChip({ status }) {
  const styles = {
    queued: 'bg-slate-500/20 text-slate-300',
    sending: 'bg-amber-500/20 text-amber-300',
    sent: 'bg-sky-500/20 text-sky-300',
    opened: 'bg-emerald-500/20 text-emerald-300',
    clicked: 'bg-indigo-500/20 text-indigo-300',
    failed: 'bg-rose-500/20 text-rose-300',
    cancelled: 'bg-slate-600/30 text-slate-500',
    paused: 'bg-amber-500/20 text-amber-200',
    draft: 'bg-slate-500/20 text-slate-400',
    completed: 'bg-emerald-500/20 text-emerald-300',
    invited: 'bg-sky-500/20 text-sky-300',
    link_clicked: 'bg-indigo-500/20 text-indigo-300',
    scheduled: 'bg-emerald-500/20 text-emerald-300',
    no_show: 'bg-rose-500/20 text-rose-300',
    none: 'bg-white/5 text-slate-500',
  }
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        styles[status] || styles.queued
      }`}
    >
      {String(status || '').replace(/_/g, ' ')}
    </span>
  )
}

function fmtTime(iso, timeZone) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      ...(timeZone ? { timeZone } : {}),
    })
  } catch {
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    } catch {
      return '—'
    }
  }
}

function localTimeZoneId() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

function isMeetJoinUrl(url) {
  return /meet\.google\.com|hangouts\.google\.com/i.test(String(url || ''))
}

function inputClass() {
  return 'saas-input'
}

function selectClass() {
  return 'saas-input saas-select'
}

/**
 * Clear booking panel: lead’s selected time + your local conversion + Meet link + admin create.
 */
function normalizeMeetingNotes(meeting) {
  const notes = String(meeting?.meetingNotes || '').trim()
  if (!notes) return ''
  if (meeting?.slotLabel && notes === meeting.slotLabel) return ''
  return String(meeting.meetingNotes || '')
}

function MeetingNotesField({ meeting, onSave, slim = true }) {
  const initial = normalizeMeetingNotes(meeting)
  const [text, setText] = useState(initial)
  const savedRef = useRef(initial)
  const busyRef = useRef(false)

  useEffect(() => {
    const next = normalizeMeetingNotes(meeting)
    setText(next)
    savedRef.current = next
  }, [meeting.id, meeting.meetingNotes, meeting.slotLabel])

  const persist = async () => {
    const next = text
    if (next === savedRef.current || busyRef.current) return
    busyRef.current = true
    try {
      await onSave(next)
      savedRef.current = next
    } finally {
      busyRef.current = false
    }
  }

  return (
    <div className="min-w-0">
      <label className="sr-only" htmlFor={`meeting-notes-${meeting.id}`}>
        Meeting notes
      </label>
      <input
        id={`meeting-notes-${meeting.id}`}
        type="text"
        className={`w-full rounded-md border border-white/10 bg-white/[0.04] text-[11px] text-white placeholder:text-slate-600 focus:border-indigo-400/40 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 ${
          slim ? 'h-7 px-2 py-0' : 'px-2.5 py-1.5'
        }`}
        value={text}
        placeholder="Meeting notes…"
        onChange={(e) => setText(e.target.value)}
        onFocus={() => {
          void persist()
        }}
        onBlur={() => {
          void persist()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
    </div>
  )
}

function MeetingBookingBlock({
  meeting,
  inviting,
  canInvite,
  onInvite,
  onSaveNotes,
  compact = false,
}) {
  const [when, setWhen] = useState(() =>
    meeting.meetingScheduledAt
      ? toDatetimeLocalValue(new Date(meeting.meetingScheduledAt))
      : '',
  )

  useEffect(() => {
    if (meeting.meetingScheduledAt) {
      setWhen(toDatetimeLocalValue(new Date(meeting.meetingScheduledAt)))
    }
  }, [meeting.id, meeting.meetingScheduledAt])

  const iso = meeting.meetingScheduledAt || ''
  const eventTz = String(meeting.meetingTimeZone || '').trim()
  const myTz = localTimeZoneId()
  const hasLeadBooking = Boolean(iso || meeting.slotLabel)

  const leadWhen = iso
    ? fmtTime(iso, eventTz || undefined)
    : meeting.slotLabel || ''
  const leadDisplay =
    (eventTz ? leadWhen : meeting.slotLabel) || leadWhen || meeting.slotLabel
  const myWhen = iso ? fmtTime(iso) : ''
  const sameZone =
    Boolean(eventTz && myTz && eventTz.toLowerCase() === myTz.toLowerCase()) ||
    (Boolean(myWhen) && leadDisplay === myWhen)

  const meetUrl = isMeetJoinUrl(meeting.meetingLink) ? meeting.meetingLink : ''
  const otherLink =
    meeting.meetingLink && !meetUrl ? String(meeting.meetingLink).trim() : ''

  return (
    <div className={`min-w-0 space-y-1.5 ${compact ? '' : 'min-w-[34rem] max-w-3xl'}`}>
      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-3'
        }`}
      >
        <div className="min-w-0 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90">
            When
          </p>
          {hasLeadBooking ? (
            <div className="mt-1 space-y-1.5">
              <div>
                <p className="text-[9px] font-medium text-emerald-400/80">
                  Lead{eventTz ? ` · ${eventTz.replace(/_/g, ' ')}` : ''}
                </p>
                <p className="text-[11px] font-semibold leading-snug text-emerald-200">
                  {leadDisplay}
                </p>
              </div>
              {myWhen ? (
                <div className="border-t border-emerald-500/15 pt-1.5">
                  <p className="text-[9px] font-medium text-sky-400/80">
                    You{myTz ? ` · ${myTz.replace(/_/g, ' ')}` : ''}
                  </p>
                  <p className="text-[11px] font-semibold leading-snug text-sky-200">
                    {myWhen}
                  </p>
                  {sameZone ? (
                    <p className="mt-0.5 text-[9px] text-slate-500">Same as lead</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-500">Not booked yet</p>
          )}
        </div>

        <div className="flex min-w-0 flex-col rounded-lg border border-indigo-500/20 bg-indigo-500/[0.06] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300/90">
            Meet link
          </p>
          <div className="mt-1 flex flex-1 items-center">
            {meetUrl ? (
              <a
                href={meetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold leading-snug text-indigo-200 underline hover:text-white"
              >
                Open Google Meet
              </a>
            ) : otherLink ? (
              <a
                href={otherLink}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[11px] text-indigo-300 underline"
              >
                Open link
              </a>
            ) : (
              <p className="text-[11px] text-slate-500">No Meet link yet</p>
            )}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {hasLeadBooking ? 'Admin invite' : 'Create invite'}
          </p>
          <p className="mt-0.5 mb-1 text-[9px] leading-snug text-slate-500">
            {hasLeadBooking ? 'Only if you need a new Meet' : 'Pick date/time for Meet'}
          </p>
          <DateTimePicker
            value={when}
            onChange={setWhen}
            allowAnyTime
            label=""
            compact
            stack
            hint="Any day · any time"
          />
          <button
            type="button"
            className="mt-1.5 w-full rounded-lg bg-indigo-500/25 px-2 py-1.5 text-[10px] font-semibold text-indigo-100 ring-1 ring-indigo-400/35 hover:bg-indigo-500/35 disabled:opacity-50"
            disabled={inviting || !canInvite || !when}
            onClick={() => {
              if (!when) return
              onInvite(when)
            }}
          >
            {inviting ? 'Creating…' : hasLeadBooking ? 'Send Meet invite' : 'Invite with Meet'}
          </button>
        </div>
      </div>

      {typeof onSaveNotes === 'function' ? (
        <MeetingNotesField meeting={meeting} onSave={onSaveNotes} slim />
      ) : null}
    </div>
  )
}

/** @deprecated alias kept if referenced elsewhere */
function MeetingInviteControls(props) {
  return <MeetingBookingBlock {...props} />
}

export default function EmailPage() {
  const { apiConfig, showToast, runWithLoading } = useAppData()
  const live = isLivePublishing()
  const mailReady =
    isGmailSendReady(apiConfig?.gmail) || isGmailConfigured(apiConfig?.gmail)
  const mailTransport =
    apiConfig?.gmail?.transport || (apiConfig?.gmail?.smtpConfigured ? 'smtp' : null)

  const [tab, setTab] = useState('mailbox')
  const [campaigns, setCampaigns] = useState([])
  const [processed, setProcessed] = useState([])
  const [meetings, setMeetings] = useState([])
  const [globalMeetingLink, setGlobalMeetingLink] = useState('')
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [bookingUrlDraft, setBookingUrlDraft] = useState('')
  const [savingBooking, setSavingBooking] = useState(false)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [calendarAuthBroken, setCalendarAuthBroken] = useState(false)
  const [invitingId, setInvitingId] = useState(null)
  const [unmatchedBookings, setUnmatchedBookings] = useState([])
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [selectedMeetingIds, setSelectedMeetingIds] = useState(() => new Set())
  const [meetingRemoveBusy, setMeetingRemoveBusy] = useState(false)
  const [meetingsPage, setMeetingsPage] = useState(1)
  const [meetingsPageSize] = useState(8)
  const [meetingsTotalPages, setMeetingsTotalPages] = useState(1)
  const [meetingsTotal, setMeetingsTotal] = useState(0)
  const [meetingsBookedCount, setMeetingsBookedCount] = useState(0)
  const [meetingsQuery, setMeetingsQuery] = useState('')
  const [meetingsSearch, setMeetingsSearch] = useState('')
  const [meetingsStatusFilter, setMeetingsStatusFilter] = useState('all')

  const [folder, setFolder] = useState('sent')
  const [mailboxQuery, setMailboxQuery] = useState('')
  const [mailboxSearch, setMailboxSearch] = useState('')
  const [mailboxMeetingFilter, setMailboxMeetingFilter] = useState('all')
  const [mailboxPage, setMailboxPage] = useState(1)
  const [mailboxPageSize] = useState(40)
  const [mailboxTotalPages, setMailboxTotalPages] = useState(1)
  const [mailboxTotal, setMailboxTotal] = useState(0)
  const [messages, setMessages] = useState([])
  const [folderCounts, setFolderCounts] = useState({})
  const [sent24h, setSent24h] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [selectedMailIds, setSelectedMailIds] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [selectMode, setSelectMode] = useState(false)

  const [campaignQuery, setCampaignQuery] = useState('')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')
  const [mode, setMode] = useState('bulk')
  const [templateType, setTemplateType] = useState('outreach')
  const [apiTemplates, setApiTemplates] = useState([])
  const [templateId, setTemplateId] = useState(OUTREACH_TEMPLATES[0].id)
  const [subject, setSubject] = useState(OUTREACH_TEMPLATES[0].subject)
  const [body, setBody] = useState(OUTREACH_TEMPLATES[0].body)
  const [htmlBody, setHtmlBody] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [sendScheduleMode, setSendScheduleMode] = useState('now')
  const [campaignStartAt, setCampaignStartAt] = useState('')
  const [cooldownMinutes, setCooldownMinutes] = useState(8)
  const [batchSize, setBatchSize] = useState(18)
  const [dailyCap, setDailyCap] = useState(200)
  const [skipAlreadyEmailed, setSkipAlreadyEmailed] = useState(true)
  const [leadPayload, setLeadPayload] = useState(null)
  const [singleTo, setSingleTo] = useState('')
  const [singleName, setSingleName] = useState('')
  const [sending, setSending] = useState(false)
  const [processedQuery, setProcessedQuery] = useState('')
  const [processedSearch, setProcessedSearch] = useState('')
  const [processedPage, setProcessedPage] = useState(1)
  const [processedPageSize] = useState(25)
  const [processedTotalPages, setProcessedTotalPages] = useState(1)
  const [processedCounts, setProcessedCounts] = useState({
    processed: 0,
    total: 0,
    meetingsBooked: 0,
    filtered: 0,
  })
  const [processedStatus, setProcessedStatus] = useState('all')
  const [processedMeetingFilter, setProcessedMeetingFilter] = useState('all')
  const [processedEngagement, setProcessedEngagement] = useState('all')
  const [processedCampaignId, setProcessedCampaignId] = useState('all')
  const [nudgeBusyId, setNudgeBusyId] = useState(null)
  const [nudgeFinalCallHours, setNudgeFinalCallHours] = useState(48)
  const [nudgeReasonHours, setNudgeReasonHours] = useState(36)
  const [nudgeFollowUpHours, setNudgeFollowUpHours] = useState(24)
  const [nudgeSettingsBusy, setNudgeSettingsBusy] = useState(false)

  const templateList = useMemo(() => {
    const fromApi = apiTemplates.filter((t) => t.type === templateType)
    if (fromApi.length) return fromApi
    const fallback = templateType === 'product' ? PRODUCT_TEMPLATES : OUTREACH_TEMPLATES
    return fallback.map((t) => ({ ...t, textBody: t.body, htmlBody: '' }))
  }, [apiTemplates, templateType])

  const selectedTemplate = useMemo(
    () => templateList.find((t) => t.id === templateId) || templateList[0] || null,
    [templateList, templateId],
  )

  const typeLabel = templateType === 'product' ? 'VorksPro' : 'Outreach'

  const loadCampaigns = useCallback(async () => {
    if (!live) return
    try {
      const data = await listEmailCampaigns({
        q: campaignSearch || undefined,
        status: campaignStatusFilter !== 'all' ? campaignStatusFilter : undefined,
        limit: 80,
      })
      setCampaigns(data.campaigns || [])
    } catch {
      /* ignore */
    }
  }, [live, campaignSearch, campaignStatusFilter])

  useEffect(() => {
    const t = setTimeout(() => setCampaignSearch(campaignQuery.trim()), 350)
    return () => clearTimeout(t)
  }, [campaignQuery])

  useEffect(() => {
    const t = setTimeout(() => setMailboxSearch(mailboxQuery.trim()), 350)
    return () => clearTimeout(t)
  }, [mailboxQuery])

  useEffect(() => {
    setMailboxPage(1)
  }, [folder, mailboxSearch, mailboxMeetingFilter])

  const loadMailbox = useCallback(async () => {
    if (!live) return
    try {
      const data = await fetchEmailMailbox({
        folder,
        q: mailboxSearch || undefined,
        meetingStatus:
          mailboxMeetingFilter !== 'all' ? mailboxMeetingFilter : undefined,
        page: mailboxPage,
        limit: mailboxPageSize,
      })
      setMessages(data.recipients || [])
      setFolderCounts(data.folderCounts || {})
      setSent24h(data.sent24h || 0)
      setMailboxTotal(data.total ?? (data.recipients || []).length)
      setMailboxTotalPages(data.totalPages || 1)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }, [
    live,
    folder,
    mailboxSearch,
    mailboxMeetingFilter,
    mailboxPage,
    mailboxPageSize,
    showToast,
  ])

  const loadProcessed = useCallback(async () => {
    if (!live) return
    try {
      const data = await listProcessedEmails({
        page: processedPage,
        limit: processedPageSize,
        q: processedSearch || undefined,
        status: processedStatus !== 'all' ? processedStatus : undefined,
        meetingStatus:
          processedMeetingFilter !== 'all' ? processedMeetingFilter : undefined,
        engagement: processedEngagement !== 'all' ? processedEngagement : undefined,
        campaignId: processedCampaignId !== 'all' ? processedCampaignId : undefined,
      })
      setProcessed(data.rows || [])
      setProcessedTotalPages(data.totalPages || 1)
      setProcessedCounts({
        processed: data.counts?.processed ?? data.total ?? 0,
        total: data.counts?.total ?? data.counts?.processed ?? data.total ?? 0,
        meetingsBooked: data.counts?.meetingsBooked ?? 0,
        filtered: data.counts?.filtered ?? data.total ?? 0,
      })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }, [
    live,
    processedPage,
    processedPageSize,
    processedSearch,
    processedStatus,
    processedMeetingFilter,
    processedEngagement,
    processedCampaignId,
    showToast,
  ])

  useEffect(() => {
    const t = setTimeout(() => {
      setProcessedSearch(processedQuery.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [processedQuery])

  useEffect(() => {
    setProcessedPage(1)
  }, [
    processedSearch,
    processedStatus,
    processedMeetingFilter,
    processedEngagement,
    processedCampaignId,
  ])

  useEffect(() => {
    if (tab !== 'processed' || !live) return
    loadProcessed()
  }, [tab, live, loadProcessed])

  const handleNudge = async (row, type) => {
    const labels = { follow_up: 'Follow Up', final_call: 'Final Call', reason: 'Reason' }
    setNudgeBusyId(`${row.id}:${type}`)
    try {
      await sendEmailNudge(row.id, type)
      showToast(`${labels[type] || 'Nudge'} sent to ${row.email}`, 'success')
      await loadProcessed()
    } catch (err) {
      showToast(err.message || 'Failed to send', 'error')
    } finally {
      setNudgeBusyId(null)
    }
  }

  const handleProcessedMeetingStatus = async (row, meetingStatus) => {
    try {
      await updateEmailMeeting(row.id, { meetingStatus })
      setProcessed((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                meetingStatus,
                nudgeAutoStopped: true,
                nudgeEligible:
                  meetingStatus !== 'scheduled' && meetingStatus !== 'completed'
                    ? r.nudgeEligible
                    : false,
              }
            : r,
        ),
      )
      showToast(
        meetingStatus === 'scheduled' || meetingStatus === 'completed'
          ? 'Status updated · auto nudges stopped'
          : 'Meeting status updated · auto nudges stopped',
        'success',
      )
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  const saveNudgeTiming = async () => {
    setNudgeSettingsBusy(true)
    try {
      const res = await saveEmailNudgeSettings({
        finalCallHours: nudgeFinalCallHours,
        reasonHours: nudgeReasonHours,
        followUpHours: nudgeFollowUpHours,
      })
      const next = res.emailNudges || {}
      if (next.finalCallHours) setNudgeFinalCallHours(next.finalCallHours)
      if (next.reasonHours) setNudgeReasonHours(next.reasonHours)
      if (next.followUpHours) setNudgeFollowUpHours(next.followUpHours)
      showToast('Auto nudge timing saved', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save nudge timing', 'error')
    } finally {
      setNudgeSettingsBusy(false)
    }
  }

  const canShowNudge = (r) => {
    if (r.nudgeEligible === true) return true
    if (r.meetingStatus === 'scheduled' || r.meetingStatus === 'completed') return false
    return (
      (r.openCount || 0) > 0 ||
      r.status === 'opened' ||
      r.status === 'clicked' ||
      r.meetingStatus === 'link_clicked' ||
      r.meetingStatus === 'invited' ||
      Boolean(r.meetingClickedAt)
    )
  }

  const canShowReminder = (r) => {
    if (!r?.meetingScheduledAt) return false
    if (!['scheduled', 'invited', 'link_clicked'].includes(r.meetingStatus || '')) return false
    const start = new Date(r.meetingScheduledAt).getTime()
    if (!Number.isFinite(start)) return false
    return start > Date.now() - 5 * 60 * 1000
  }

  const handleReminder = async (row) => {
    setNudgeBusyId(`${row.id}:reminder`)
    try {
      await sendMeetingReminder(row.id, { force: Boolean(row.meetingReminderSentAt) })
      showToast(`Meeting reminder sent to ${row.email}`, 'success')
      setProcessed((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, meetingReminderSentAt: new Date().toISOString() }
            : r,
        ),
      )
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === row.id
            ? { ...m, meetingReminderSentAt: new Date().toISOString() }
            : m,
        ),
      )
    } catch (err) {
      showToast(err.message || 'Failed to send reminder', 'error')
    } finally {
      setNudgeBusyId(null)
    }
  }

  const loadMeetings = useCallback(async (opts = {}) => {
    if (!live) return
    try {
      const data = await listEmailMeetings({
        page: meetingsPage,
        limit: meetingsPageSize,
        q: meetingsSearch || undefined,
        meetingStatus:
          meetingsStatusFilter !== 'all' ? meetingsStatusFilter : undefined,
        sync: opts.sync === true,
      })
      setMeetings(data.meetings || [])
      setMeetingsTotalPages(data.totalPages || 1)
      setMeetingsTotal(data.total ?? data.counts?.pipeline ?? 0)
      setMeetingsBookedCount(data.counts?.meetingsBooked ?? 0)
      setSelectedMeetingIds((prev) => {
        if (!prev.size) return prev
        const nextIds = new Set((data.meetings || []).map((m) => m.id))
        const kept = [...prev].filter((id) => nextIds.has(id))
        return kept.length === prev.size ? prev : new Set(kept)
      })
      setUnmatchedBookings(data.unmatchedBookings || data.sync?.unmatchedBookings || [])
      if (data.meetingLink) setGlobalMeetingLink(data.meetingLink)
      if (data.calendarBookingUrl != null) setBookingUrlDraft(data.calendarBookingUrl || data.meetingLink || '')
      if (typeof data.calendarConnected === 'boolean') {
        setCalendarConnected(data.calendarConnected)
      }
      if (data.sync?.ok === false && data.sync?.error) {
        const msg = data.sync.error
        if (/Reconnect Gmail|session expired or revoked|missing Calendar permission/i.test(msg)) {
          setCalendarAuthBroken(true)
        }
      } else if (data.sync?.ok !== false) {
        setCalendarAuthBroken(false)
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }, [
    live,
    meetingsPage,
    meetingsPageSize,
    meetingsSearch,
    meetingsStatusFilter,
    showToast,
  ])

  useEffect(() => {
    const t = setTimeout(() => setMeetingsSearch(meetingsQuery.trim()), 350)
    return () => clearTimeout(t)
  }, [meetingsQuery])

  useEffect(() => {
    setMeetingsPage(1)
  }, [meetingsSearch, meetingsStatusFilter])

  useEffect(() => {
    if (tab !== 'meetings' || !live) return
    loadMeetings({ sync: false })
  }, [tab, live, loadMeetings])

  const REFRESH_MS = 90_000 // auto-refresh mail + meetings every ~1.5 min

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadCampaigns(),
      loadProcessed(),
      // Soft refresh meetings without full calendar sync on every tick
      loadMeetings({ sync: false }),
      loadMailbox(),
    ])
  }, [loadCampaigns, loadProcessed, loadMeetings, loadMailbox])

  useEffect(() => {
    refreshAll()
    const t = setInterval(refreshAll, REFRESH_MS)
    return () => clearInterval(t)
  }, [refreshAll])

  // When opening Meetings, sync Calendar once (don't wait for the interval).
  useEffect(() => {
    if (tab === 'meetings' && live) {
      loadMeetings({ sync: true })
    }
  }, [tab, live]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh meetings list when a booking is confirmed in realtime
  useEffect(() => {
    if (!live) return undefined
    return subscribeRealtime((event) => {
      if (event?.type === 'MEETING_SCHEDULED' || event?.type === 'MEETING_REMINDER') {
        loadMeetings({ sync: false })
      }
    })
  }, [live, loadMeetings])

  useEffect(() => {
    if (!selectedId || !live || tab !== 'mailbox') {
      if (tab !== 'mailbox') setDetail(null)
      return
    }
    fetchEmailMailboxMessage(selectedId)
      .then((data) => setDetail(data))
      .catch((err) => showToast(err.message, 'error'))
  }, [selectedId, live, showToast, tab])

  useEffect(() => {
    if (!live) return
    getEmailSettings()
      .then((s) => {
        const link = s.calendarBookingUrl || s.meetingLink || ''
        if (link) {
          setMeetingLink(link)
          setGlobalMeetingLink(link)
          setBookingUrlDraft(link)
        }
        if (typeof s.calendarConnected === 'boolean') {
          setCalendarConnected(s.calendarConnected)
        }
        if (s.defaults?.cooldownMinutes) setCooldownMinutes(s.defaults.cooldownMinutes)
        if (s.defaults?.batchSize) setBatchSize(s.defaults.batchSize)
        if (s.defaults?.dailyCap) setDailyCap(s.defaults.dailyCap)
        if (s.emailNudges) {
          if (s.emailNudges.finalCallHours)
            setNudgeFinalCallHours(s.emailNudges.finalCallHours)
          if (s.emailNudges.reasonHours) setNudgeReasonHours(s.emailNudges.reasonHours)
          if (s.emailNudges.followUpHours)
            setNudgeFollowUpHours(s.emailNudges.followUpHours)
        }
      })
      .catch(() => {})
    listEmailTemplates({ meetingLink: meetingLink || globalMeetingLink })
      .then((d) => setApiTemplates(d.templates || []))
      .catch(() => {})
  }, [live, meetingLink, globalMeetingLink])

  const DEFAULT_CALENDAR_BOOKING = 'https://calendar.app.google/eKcZV6Cy9SuCgA878'
  const isCalendarBookingUrl = (u) =>
    /calendar\.app\.google|calendar\.google\.com|appointments|calendly\.com|cal\.com\//i.test(
      String(u || ''),
    )

  const rawBooking = (globalMeetingLink || meetingLink || bookingUrlDraft || '').trim()
  const workspaceBooking = isCalendarBookingUrl(rawBooking)
    ? rawBooking
    : DEFAULT_CALENDAR_BOOKING

  const saveWorkspaceBooking = async () => {
    const url = bookingUrlDraft.trim()
    if (
      url &&
      !/calendar\.app\.google|calendar\.google\.com|appointments|calendly\.com|cal\.com\//i.test(url)
    ) {
      showToast(
        'Use a Google Calendar booking / Calendly / Cal.com link — not your product site.',
        'error',
      )
      return
    }
    setSavingBooking(true)
    try {
      const data = await saveCalendarSettings({
        calendarBookingUrl: bookingUrlDraft.trim(),
      })
      const link = data.meetingLink || data.calendarBookingUrl || bookingUrlDraft.trim()
      setGlobalMeetingLink(link)
      setMeetingLink(link)
      setBookingUrlDraft(link)
      if (typeof data.calendarConnected === 'boolean') {
        setCalendarConnected(data.calendarConnected)
      }
      showToast('Workspace booking link saved. All product campaigns will use it.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingBooking(false)
    }
  }

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true)
    try {
      const data = await syncEmailCalendar()
      setCalendarAuthBroken(false)
      const unmatched = data.unmatchedBookings?.length || 0
      showToast(
        data.updated
          ? `Synced ${data.updated} meeting${data.updated === 1 ? '' : 's'} from Google Calendar.`
          : unmatched
            ? `Found ${unmatched} calendar booking${unmatched === 1 ? '' : 's'} (not matched to a lead email).`
            : `No new matches (${data.eventsScanned || 0} events scanned).`,
        'success',
      )
      await loadMeetings({ sync: false })
      if (data.unmatchedBookings) setUnmatchedBookings(data.unmatchedBookings)
    } catch (err) {
      const msg = err.message || 'Sync failed'
      showToast(msg, 'error')
      if (/Reconnect Gmail|session expired or revoked|missing Calendar permission/i.test(msg)) {
        setCalendarAuthBroken(true)
      }
    } finally {
      setSyncingCalendar(false)
    }
  }

  const handleInviteMeet = async (m, startLocal) => {
    if (!startLocal) {
      showToast('Pick a date and time first.', 'error')
      return
    }
    setInvitingId(m.id)
    try {
      const startIso = new Date(startLocal).toISOString()
      const res = await createCalendarInvite({
        recipientId: m.id,
        startIso,
        durationMinutes: 30,
        summary: `Meeting with ${m.name || m.email}`,
      })
      const link = res.meetingLink || res.meetLink || ''
      showToast(
        link
          ? 'Meet created — link emailed to lead and admin. Saved on this row.'
          : 'Calendar invite sent. Open the meeting link column after refresh.',
        'success',
      )
      await loadMeetings({ sync: false })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setInvitingId(null)
    }
  }

  const applyTemplate = (tpl) => {
    setTemplateId(tpl.id)
    setSubject(tpl.subject)
    setBody(tpl.textBody || tpl.body || '')
    setHtmlBody(tpl.htmlBody || '')
  }

  useEffect(() => {
    if (templateList[0]) applyTemplate(templateList[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType, apiTemplates])

  const previewMerge = useMemo(() => {
    const lead = leadPayload?.leads?.[0]
    const previewName = lead?.name || singleName || ''
    const previewFirst =
      lead?.mergeData?.firstName ||
      previewName.split(/\s+/).filter(Boolean)[0] ||
      ''
    const data = {
      ...(lead?.mergeData || {
        company: 'Acme',
        designation: 'CEO',
        city: 'Stockholm',
        country: 'Sweden',
        region: 'Sweden',
        industry: 'SaaS',
        fomoLine: 'Most teams in Stockholm, Sweden still lose weeks to agency handoffs and half-finished builds.',
        companyLabel: 'Acme',
      }),
      name: previewName || lead?.mergeData?.name || 'Alex',
      firstName: previewFirst || 'Alex',
      greeting: previewFirst
        ? `Hi ${previewFirst}`
        : previewName
          ? `Hi ${previewName}`
          : 'Hi Alex',
      meetingLink: workspaceBooking || 'https://calendar.google.com/...',
      _previewKey: 'preview',
    }
    const subjectOut = mergeTemplate(subject, data)
    const bodyOut = forceScheduleMeetingText(mergeTemplate(body, data), workspaceBooking)
    const htmlOut = htmlBody
      ? forceScheduleMeetingHrefs(mergeTemplate(htmlBody, data), workspaceBooking)
      : ''
    return {
      subject: subjectOut,
      body: bodyOut,
      html: htmlOut,
    }
  }, [subject, body, htmlBody, leadPayload, singleName, workspaceBooking])

  const estFinish = useMemo(() => {
    const n = mode === 'single' ? 1 : leadPayload?.leads?.length || 0
    if (!n) return null
    const every = Math.min(20, Math.max(15, batchSize || 18))
    const restMin = Math.max(1, cooldownMinutes || 8)
    const avgGapSec = 15
    const rests = Math.max(0, Math.ceil(n / every) - 1)
    const totalSec = Math.max(0, n - 1) * avgGapSec + rests * restMin * 60
    const hours = Math.floor(totalSec / 3600)
    const rem = Math.round((totalSec % 3600) / 60)
    return hours > 0 ? `~${hours}h ${rem}m` : `~${rem}m`
  }, [mode, leadPayload, cooldownMinutes, batchSize])

  const filteredProcessed = processed

  const selectableIds = useMemo(() => {
    if (tab === 'processed') return filteredProcessed.map((r) => r.id)
    if (tab === 'mailbox') return messages.map((m) => m.id)
    return []
  }, [tab, filteredProcessed, messages])

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedMailIds.has(id))
  const selectedCount = selectedMailIds.size

  useEffect(() => {
    setSelectedMailIds(new Set())
    setSelectMode(false)
  }, [
    folder,
    tab,
    processedStatus,
    processedMeetingFilter,
    processedEngagement,
    mailboxSearch,
    mailboxMeetingFilter,
  ])

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedMailIds(new Set())
  }

  const toggleMailSelect = (id) => {
    setSelectedMailIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedMailIds(new Set())
      return
    }
    setSelectedMailIds(new Set(selectableIds))
  }

  const runBulkMailbox = async (action) => {
    const ids = [...selectedMailIds]
    if (!ids.length) {
      showToast('Select at least one message.', 'error')
      return
    }
    if (action === 'delete') {
      setConfirmDialog({
        title: 'Delete forever?',
        message: `Delete ${ids.length} message${ids.length === 1 ? '' : 's'} forever? This cannot be undone.`,
        confirmLabel: 'Delete forever',
        onConfirm: () => executeBulkMailbox(ids, action),
      })
      return
    }
    await executeBulkMailbox(ids, action)
  }

  const executeBulkMailbox = async (ids, action) => {
    setBulkBusy(true)
    try {
      const data = await bulkMailboxAction({ ids, action })
      const n = data.updated || data.deleted || ids.length
      showToast(
        action === 'junk'
          ? `Moved ${n} to Junk`
          : action === 'restore'
            ? `Restored ${n}`
            : `Deleted ${n} forever`,
        'success',
      )
      setSelectedMailIds(new Set())
      setSelectMode(false)
      if (selectedId && ids.includes(selectedId)) {
        setSelectedId(null)
        setDetail(null)
      }
      await Promise.all([loadMailbox(), loadProcessed()])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleStartCampaign = async () => {
    if (!mailReady) {
      showToast('Mail is not ready. Set SMTP in api .env or connect Gmail.', 'error')
      return
    }
    if (!live) {
      showToast('Set VITE_API_BASE_URL to send email.', 'error')
      return
    }
    if (templateType === 'product' && !workspaceBooking) {
      showToast(
        'Save your Google Calendar booking link once in the Meetings tab (or connect Calendar).',
        'error',
      )
      setTab('meetings')
      return
    }

    let recipients = []
    if (mode === 'single') {
      const email = singleTo.trim().toLowerCase()
      if (!email.includes('@')) {
        showToast('Enter a valid recipient email.', 'error')
        return
      }
      recipients = [
        {
          email,
          name: singleName,
          mergeData: {
            email,
            name: singleName,
            firstName: singleName.split(/\s+/).filter(Boolean)[0] || '',
            greeting: singleName.trim()
              ? `Hi ${singleName.split(/\s+/).filter(Boolean)[0] || singleName.trim()}`
              : 'Hi there',
            meetingLink: workspaceBooking,
            fomoLine: 'Most teams in your market still lose weeks to agency handoffs and half-finished builds.',
          },
        },
      ]
    } else {
      recipients = leadPayload?.leads || []
      if (!recipients.length) {
        showToast('Upload an Excel file or paste a Google Sheets link first.', 'error')
        return
      }
    }

    const booking = workspaceBooking
    const dualCtaHtml = booking
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;"><tr>
<td style="padding-right:10px;padding-bottom:8px;"><a href="https://aftabahmadkhan.online" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f172a;color:#fff;font-weight:700;text-decoration:none;font-size:14px;">View portfolio</a></td>
<td style="padding-bottom:8px;"><a href="${booking}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#4f46e5;color:#fff;font-weight:700;text-decoration:none;font-size:14px;">Schedule a meeting</a></td>
</tr></table>
<p style="font-size:12px;color:#64748b;margin:0 0 12px;">Schedule opens my Google Calendar — pick a time that works for you.</p>`
      : ''
    let sendHtml = htmlBody
    if (sendHtml && booking && !/Schedule a meeting/i.test(sendHtml)) {
      sendHtml = sendHtml.replace(
        /(<\/td>\s*<\/tr>\s*<\/table>\s*<hr)/i,
        `${dualCtaHtml}$1`,
      )
      if (!/Schedule a meeting/i.test(sendHtml)) {
        sendHtml = `${sendHtml}${dualCtaHtml}`
      }
    }
    if (!sendHtml) {
      sendHtml = `<div style="font-family:system-ui,sans-serif;line-height:1.55">${body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>\n')}</div>${dualCtaHtml}`
    }
    // Never let Schedule CTAs keep portfolio / product / dashboard hrefs.
    sendHtml = forceScheduleMeetingHrefs(sendHtml, booking)
    const sendText = forceScheduleMeetingText(body, booking)
    const primary = {
      name: selectedTemplate?.name || 'Selected',
      subject,
      textBody: sendText,
      htmlBody: sendHtml,
    }

    const scheduledIso =
      sendScheduleMode === 'later' && campaignStartAt
        ? datetimeLocalToISO(campaignStartAt)
        : null
    if (sendScheduleMode === 'later' && !parseDatetimeLocal(campaignStartAt)) {
      showToast('Pick a start date and time for this campaign.', 'error')
      return
    }
    if (scheduledIso && new Date(scheduledIso).getTime() <= Date.now() + 30_000) {
      showToast('Scheduled start must be at least 30 seconds from now.', 'error')
      return
    }

    setSending(true)
    try {
      await runWithLoading(
        scheduledIso ? 'Scheduling campaign…' : 'Starting campaign…',
        async () => {
          await createEmailCampaign({
            name: `${typeLabel}${selectedTemplate?.name ? ` · ${selectedTemplate.name}` : ''}`,
            subject: primary.subject,
            textBody: primary.textBody,
            htmlBody: primary.htmlBody,
            templates: [primary],
            templateType,
            recipients: recipients.map((r) => {
              const nm = String(r.name || r.mergeData?.name || '').trim()
              const fn =
                String(r.mergeData?.firstName || '').trim() ||
                nm.split(/\s+/).filter(Boolean)[0] ||
                ''
              return {
                email: r.email,
                name: nm,
                company: r.company,
                designation: r.designation,
                location: r.location,
                sheetName: r.sheetName,
                rowNumber: r.rowNumber,
                niche: r.industry || r.niche,
                mergeData: {
                  ...(r.mergeData || {}),
                  name: nm || r.mergeData?.name || '',
                  firstName: fn,
                  greeting: fn ? `Hi ${fn}` : nm ? `Hi ${nm}` : 'Hi there',
                  meetingLink: booking || r.mergeData?.meetingLink,
                },
              }
            }),
            leadSourceId: leadPayload?.source?.id,
            meetingLink: booking,
            trackOpens: true,
            sendNow: true,
            scheduledAt: scheduledIso || undefined,
            cooldownMinutes: mode === 'single' ? 1 : cooldownMinutes,
            batchSize: mode === 'single' ? 18 : batchSize,
            dailyCap,
          })
          await saveEmailTemplateDraft(subject, body, { meetingLink: booking, templateType })
        },
        { blocking: mode === 'bulk' && recipients.length > 5 },
      )
      showToast(
        mode === 'single'
          ? scheduledIso
            ? 'Email scheduled'
            : 'Email queued'
          : scheduledIso
            ? `Campaign scheduled · ${recipients.length} leads · starts ${new Date(scheduledIso).toLocaleString()}`
            : `Campaign started · ${recipients.length} leads · 0–30s gaps · ${cooldownMinutes} min rest every ${batchSize}`,
      )
      setTab('processed')
      await refreshAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  const activeCampaigns = campaigns.filter((c) =>
    ['sending', 'paused', 'draft'].includes(c.status),
  )
  const recentCampaigns = campaigns.filter(
    (c) => !['sending', 'paused', 'draft'].includes(c.status),
  )
  const showCampaignBuckets = campaignStatusFilter === 'all'

  return (
    <PageShell>
      <PageHeader
        title="Mail Box"
        subtitle={
          mailReady
            ? mailTransport === 'smtp'
              ? 'Sending via SMTP · campaigns, tracking & meetings'
              : 'Gmail connected · campaigns, tracking & meetings'
            : 'Configure SMTP or Gmail to send'
        }
        action={
          <div className="saas-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`saas-tab ${tab === t.id ? 'saas-tab--active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {!live && (
        <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect the API (`VITE_API_BASE_URL`) to use Mail Box.
        </p>
      )}

      {/* ─── Native Mail Box ─── */}
      {tab === 'mailbox' && (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080a12]">
          <aside className="hidden w-44 shrink-0 flex-col border-r border-white/[0.06] bg-[#070910] sm:flex">
            <div className="p-3">
              <button
                type="button"
                className="btn-primary w-full py-2 text-sm"
                onClick={() => setTab('campaigns')}
              >
                Compose
              </button>
            </div>
            <nav className="saas-scroll flex-1 space-y-0.5 overflow-y-auto px-2">
              {MAILBOX_FOLDERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolder(f.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    folder === f.id
                      ? 'bg-indigo-500/15 font-semibold text-white ring-1 ring-indigo-400/25'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="tabular-nums text-[10px] text-slate-500">
                    {folderCounts[f.id] ?? ''}
                  </span>
                </button>
              ))}
            </nav>
            <div className="border-t border-white/[0.06] p-3 text-[10px] text-slate-500">
              <p>
                Sent last 24h:{' '}
                <span className="text-slate-300">{sent24h}</span>
              </p>
            </div>
          </aside>

          <section className="flex w-full min-w-0 flex-col border-r border-white/[0.06] sm:w-[340px] lg:w-[380px]">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-black/20 px-3 py-2">
              <input
                value={mailboxQuery}
                onChange={(e) => setMailboxQuery(e.target.value)}
                placeholder="Search mail…"
                className="saas-input min-w-0 flex-1 basis-[10rem] py-0 text-xs h-[2.125rem]"
              />
              <select
                className={`${selectClass()} !min-w-[7.5rem]`}
                value={mailboxMeetingFilter}
                onChange={(e) => setMailboxMeetingFilter(e.target.value)}
                title="Meeting status"
              >
                <option value="all">All meetings</option>
                <option value="none">No meeting</option>
                <option value="invited">Invited</option>
                <option value="link_clicked">Link clicked</option>
                <option value="scheduled">Scheduled</option>
              </select>
              {!selectMode ? (
                <button
                  type="button"
                  className="btn-secondary h-[2.125rem] shrink-0 px-2.5 text-[10px]"
                  disabled={!messages.length}
                  onClick={() => setSelectMode(true)}
                >
                  Select
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary h-[2.125rem] shrink-0 px-2.5 text-[10px]"
                  onClick={exitSelectMode}
                >
                  Done
                </button>
              )}
              <select
                className={`${selectClass()} !min-w-[6.5rem] sm:hidden`}
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                {MAILBOX_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {selectMode && tab === 'mailbox' && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] bg-indigo-500/[0.07] px-3 py-2">
                <label className="mr-1 flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-indigo-200">
                  <input
                    type="checkbox"
                    checked={allSelected && messages.length > 0}
                    onChange={toggleSelectAll}
                    disabled={!messages.length}
                    className="rounded border-white/20"
                  />
                  Select all
                </label>
                {selectedCount > 0 && (
                  <span className="text-[10px] text-slate-400">{selectedCount} selected</span>
                )}
                {selectedCount > 0 &&
                  (folder === 'junk' ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
                        disabled={bulkBusy}
                        onClick={() => runBulkMailbox('restore')}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-rose-500/20 px-2 py-1 text-[10px] font-semibold text-rose-300 disabled:opacity-50"
                        disabled={bulkBusy}
                        onClick={() => runBulkMailbox('delete')}
                      >
                        Delete forever
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => runBulkMailbox('junk')}
                    >
                      Move to Junk
                    </button>
                  ))}
              </div>
            )}

            <div className="saas-scroll min-h-0 flex-1 overflow-y-auto">
              {!live && (
                <p className="p-4 text-sm text-slate-500">Connect the API to use the mailbox.</p>
              )}
              {live && messages.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No messages in this folder.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex w-full items-start gap-2 border-b border-white/[0.04] px-3 py-2.5 transition hover:bg-white/[0.03] ${
                    selectedId === m.id ? 'bg-white/[0.06]' : ''
                  } ${selectMode && selectedMailIds.has(m.id) ? 'bg-indigo-500/[0.08]' : ''}`}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedMailIds.has(m.id)}
                      onChange={() => toggleMailSelect(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-white/20"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectMode) {
                        toggleMailSelect(m.id)
                        return
                      }
                      setSelectedId(m.id)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {m.name || m.email}
                      </p>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {fmtTime(m.sentAt || m.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {m.renderedSubject || m.company || m.email}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusChip status={m.status} />
                      {m.openCount > 0 && (
                        <span className="text-[10px] text-emerald-400/80">
                          {m.openCount} open{m.openCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {m.meetingStatus && m.meetingStatus !== 'none' && (
                        <StatusChip status={m.meetingStatus} />
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2">
              <p className="text-[10px] text-slate-500">
                {mailboxTotal} · p.{mailboxPage}/{mailboxTotalPages}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 disabled:opacity-40"
                  disabled={mailboxPage <= 1}
                  onClick={() => setMailboxPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 disabled:opacity-40"
                  disabled={mailboxPage >= mailboxTotalPages}
                  onClick={() =>
                    setMailboxPage((p) => Math.min(mailboxTotalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          <section className="hidden min-w-0 flex-1 flex-col lg:flex">
            {!detail?.recipient ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="font-display text-lg text-slate-400">Mail Box</p>
                <p className="max-w-sm text-sm text-slate-600">
                  Select a message to read it, or open Campaigns to compose and send.
                </p>
              </div>
            ) : (
              <>
                <header className="border-b border-white/[0.06] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-white">
                        {detail.recipient.renderedSubject || 'No subject'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        To:{' '}
                        {detail.recipient.name
                          ? `${detail.recipient.name} <${detail.recipient.email}>`
                          : detail.recipient.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <StatusChip status={detail.recipient.status} />
                        {detail.recipient.company && <span>{detail.recipient.company}</span>}
                        {detail.recipient.location && <span>{detail.recipient.location}</span>}
                        {detail.recipient.meetingStatus &&
                          detail.recipient.meetingStatus !== 'none' && (
                            <StatusChip status={detail.recipient.meetingStatus} />
                          )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right text-[11px] text-slate-500">
                        <p>Opens: {detail.recipient.openCount || 0}</p>
                        <p>Clicks: {detail.recipient.clickCount || 0}</p>
                        <p>Sent: {fmtTime(detail.recipient.sentAt)}</p>
                        {detail.recipient.meetingLink && (
                          <a
                            href={detail.recipient.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-indigo-300 hover:underline"
                          >
                            Meeting link
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {detail.recipient.mailboxFolder === 'junk' ? (
                          <>
                            <button
                              type="button"
                              className="btn-secondary px-2.5 py-1 text-[11px]"
                              onClick={async () => {
                                try {
                                  await restoreMailboxFromJunk(detail.recipient.id)
                                  showToast('Restored to inbox', 'success')
                                  setSelectedId(null)
                                  setDetail(null)
                                  await loadMailbox()
                                } catch (err) {
                                  showToast(err.message, 'error')
                                }
                              }}
                            >
                              Move to inbox
                            </button>
                            <button
                              type="button"
                              className="btn-danger px-2.5 py-1 text-[11px]"
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Delete forever?',
                                  message: 'Delete this message forever? This cannot be undone.',
                                  confirmLabel: 'Delete forever',
                                  onConfirm: async () => {
                                    await deleteMailboxForever(detail.recipient.id)
                                    showToast('Deleted forever', 'success')
                                    setSelectedId(null)
                                    setDetail(null)
                                    await loadMailbox()
                                  },
                                })
                              }}
                            >
                              Delete forever
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary px-2.5 py-1 text-[11px]"
                            onClick={async () => {
                              try {
                                await moveMailboxToJunk(detail.recipient.id)
                                showToast('Moved to Junk', 'success')
                                setSelectedId(null)
                                setDetail(null)
                                await loadMailbox()
                              } catch (err) {
                                showToast(err.message, 'error')
                              }
                            }}
                          >
                            Move to Junk
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  {detail.recipient.renderedHtml ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-slate-200"
                      dangerouslySetInnerHTML={{
                        __html: detail.recipient.renderedHtml,
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {detail.recipient.renderedText || 'Content not captured yet.'}
                    </pre>
                  )}
                  {detail.recipient.error && (
                    <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      {detail.recipient.error}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ─── Campaigns tab ─── */}
      {tab === 'campaigns' && (
        <PageScroll className="pb-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 saas-panel">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Lead source</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Choose Excel file or paste an Excel / Google Sheets link, then start the campaign.
                  </p>
                </div>
                <div className="flex gap-1">
                  {['bulk', 'single'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        mode === m
                          ? 'bg-indigo-500/25 text-indigo-200'
                          : 'bg-white/[0.04] text-slate-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'bulk' ? (
                <LeadSourcePanel
                  skipAlreadyEmailed={skipAlreadyEmailed}
                  onSkipChange={setSkipAlreadyEmailed}
                  onLoaded={setLeadPayload}
                  disabled={sending}
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass()}
                    placeholder="To email"
                    value={singleTo}
                    onChange={(e) => setSingleTo(e.target.value)}
                  />
                  <input
                    className={inputClass()}
                    placeholder="Name"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                  />
                </div>
              )}

              {leadPayload?.source?.id && (
                <button
                  type="button"
                  className="mt-3 text-xs text-indigo-300 hover:underline"
                  onClick={() =>
                    downloadLeadSourceExport(
                      leadPayload.source.id,
                      leadPayload.source.fileName || 'leads-updated.xlsx',
                    ).catch((e) => showToast(e.message, 'error'))
                  }
                >
                  Download updated Excel (status columns)
                </button>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Template & send settings</h3>

              <div className="mb-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-slate-400">Campaign type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'outreach', label: 'Outreach' },
                      { id: 'product', label: 'VorksPro' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateType(t.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          templateType === t.id
                            ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                            : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-slate-400">
                    Template · {typeLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {templateList.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          templateId === t.id
                            ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                            : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-slate-400">
                    Start sending
                  </p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSendScheduleMode('now')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        sendScheduleMode === 'now'
                          ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                          : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Send now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSendScheduleMode('later')
                        if (!campaignStartAt) {
                          const soon = new Date(Date.now() + 60 * 60 * 1000)
                          setCampaignStartAt(toDatetimeLocalValue(soon))
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        sendScheduleMode === 'later'
                          ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                          : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pick date & time
                    </button>
                  </div>
                  {sendScheduleMode === 'later' && (
                    <DateTimePicker
                      label="Campaign start"
                      value={campaignStartAt}
                      onChange={setCampaignStartAt}
                      minDate={toDatetimeLocalValue(new Date())}
                      hint="Campaign waits until this time, then sends with normal pacing."
                      stack
                    />
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  Meeting booking link
                  {templateType === 'product' ? ' (from workspace)' : ' (optional)'}
                </label>
                {workspaceBooking ? (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[11px] text-emerald-300/90">Using workspace booking link</p>
                    <a
                      href={workspaceBooking}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate text-xs text-indigo-300 hover:underline"
                    >
                      {workspaceBooking}
                    </a>
                    <button
                      type="button"
                      className="mt-1.5 text-[11px] font-medium text-slate-400 hover:text-white"
                      onClick={() => setTab('meetings')}
                    >
                      Change in Meetings →
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-amber-100/90">
                    No workspace booking link yet.{' '}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => setTab('meetings')}
                    >
                      Set it once in Meetings
                    </button>
                    {templateType === 'product' ? ' (required for VorksPro).' : '.'}
                  </div>
                )}
              </div>

              {mode === 'bulk' && (
                <div className="mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Rest every (emails)
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={20}
                        className={inputClass()}
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value) || 18)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Rest duration (min)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        className={inputClass()}
                        value={cooldownMinutes}
                        onChange={(e) => setCooldownMinutes(Number(e.target.value) || 8)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">Max / 24h</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        className={inputClass()}
                        value={dailyCap}
                        onChange={(e) => setDailyCap(Number(e.target.value) || 200)}
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-[11px] text-slate-500">
                        Est. {estFinish || '—'} · {leadPayload?.leads?.length || 0} leads
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Each email waits a random 0–30s. After every {batchSize} sends, the campaign
                    pauses {cooldownMinutes} min, then continues automatically.
                  </p>
                </div>
              )}

              <input
                className={`${inputClass()} mb-2 font-medium`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
              />
              <textarea
                className={`${inputClass()} min-h-[140px] leading-relaxed`}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value)
                  setHtmlBody('')
                }}
                placeholder="Body"
              />

              {isLocalApi() && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Open/click tracking needs a public API_PUBLIC_URL in production.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary px-4 py-2 text-sm"
                  disabled={sending || !mailReady}
                  onClick={handleStartCampaign}
                >
                  {sending ? 'Starting…' : 'Start campaign'}
                </button>
                {!mailReady && (
                  <Link to="/api-config" className="btn-secondary px-3 py-2 text-xs">
                    Fix mail setup
                  </Link>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="mr-auto text-sm font-semibold text-white">Campaigns</h3>
                <input
                  className={`${inputClass()} !h-[2.125rem] max-w-[11rem] !py-0 text-xs`}
                  placeholder="Search campaigns…"
                  value={campaignQuery}
                  onChange={(e) => setCampaignQuery(e.target.value)}
                />
                <select
                  className={selectClass()}
                  value={campaignStatusFilter}
                  onChange={(e) => setCampaignStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="sending">Sending</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {showCampaignBuckets ? (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Active
                  </p>
                  {activeCampaigns.length === 0 && (
                    <p className="text-xs text-slate-500">No running campaigns. Start one from the left.</p>
                  )}
                </>
              ) : null}

              <div className="space-y-2">
                {(showCampaignBuckets ? activeCampaigns : campaigns).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{c.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{c.subject}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusChip status={c.status} />
                          <span className="text-[10px] text-slate-500">
                            {c.stats?.sent || 0}/{c.stats?.total || 0} sent · {c.stats?.opened || 0}{' '}
                            opens · {c.stats?.clicked || 0} clicks
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        {c.status === 'sending' && (
                          <button
                            type="button"
                            className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200"
                            onClick={() =>
                              pauseEmailCampaign(c.id)
                                .then(refreshAll)
                                .catch((e) => showToast(e.message, 'error'))
                            }
                          >
                            Stop / Pause
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200"
                            onClick={() =>
                              resumeEmailCampaign(c.id)
                                .then(refreshAll)
                                .catch((e) => showToast(e.message, 'error'))
                            }
                          >
                            Resume
                          </button>
                        )}
                        {['sending', 'paused', 'draft'].includes(c.status) && (
                          <button
                            type="button"
                            className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300"
                            onClick={() =>
                              cancelEmailCampaign(c.id)
                                .then(refreshAll)
                                .catch((e) => showToast(e.message, 'error'))
                            }
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    {c.meetingLink && (
                      <a
                        href={c.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block truncate text-[10px] text-indigo-300 hover:underline"
                      >
                        Meeting: {c.meetingLink}
                      </a>
                    )}
                  </div>
                ))}
                {!showCampaignBuckets && campaigns.length === 0 && (
                  <p className="text-xs text-slate-500">No campaigns match this filter.</p>
                )}
              </div>

              {showCampaignBuckets && recentCampaigns.length > 0 && (
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Recent
                  </p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {recentCampaigns.slice(0, 12).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="truncate text-slate-400">{c.name}</span>
                        <StatusChip status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Preview
              </p>
              <p className="mt-1 text-sm font-medium text-white">{previewMerge.subject}</p>
              {previewMerge.html ? (
                <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/5 bg-white">
                  <iframe
                    title="Email preview"
                    className="h-56 w-full"
                    sandbox=""
                    srcDoc={previewMerge.html}
                  />
                </div>
              ) : (
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-slate-400">
                  {previewMerge.body}
                </pre>
              )}
              <p className="mt-2 text-[10px] text-slate-600">
                {SIGNATURE.name} · {SIGNATURE.site}
              </p>
            </section>
          </div>
        </div>
        </PageScroll>
      )}

      {/* ─── Processed mail table ─── */}
      {tab === 'processed' && (
        <PageScroll className="pb-8">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
            title="Emails already sent (or failed) out of all recipients in campaigns"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Processed mail
            </p>
            <p className="mt-0.5 text-lg font-semibold text-white tabular-nums">
              {processedCounts.processed.toLocaleString()}
              <span className="text-slate-500"> / </span>
              <span className="text-slate-300">
                {processedCounts.total.toLocaleString()}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              sent of total recipients
            </p>
          </div>
          <div
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5"
            title="Leads who booked a meeting from campaign emails"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
              Meetings booked
            </p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-200 tabular-nums">
              {processedCounts.meetingsBooked.toLocaleString()}
            </p>
          </div>
          <div
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 sm:col-span-2"
            title="Rows matching your current search and filters"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Showing (filtered)
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-200 tabular-nums">
              {processedCounts.filtered.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-slate-500">
                · page {processedPage}/{processedTotalPages}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Auto nudges: Final Call {nudgeFinalCallHours}h → Reason +
              {nudgeReasonHours}h → Follow Up +{nudgeFollowUpHours}h if status unchanged
            </p>
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Auto nudge timing</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Final Call (hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  className={inputClass()}
                  value={nudgeFinalCallHours}
                  onChange={(e) =>
                    setNudgeFinalCallHours(Number(e.target.value) || 48)
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Reason after (hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  className={inputClass()}
                  value={nudgeReasonHours}
                  onChange={(e) => setNudgeReasonHours(Number(e.target.value) || 36)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Follow Up after (hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  className={inputClass()}
                  value={nudgeFollowUpHours}
                  onChange={(e) =>
                    setNudgeFollowUpHours(Number(e.target.value) || 24)
                  }
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn-secondary w-full px-3 py-2 text-xs disabled:opacity-50"
                  disabled={nudgeSettingsBusy || !live}
                  onClick={saveNudgeTiming}
                >
                  {nudgeSettingsBusy ? 'Saving…' : 'Save timing'}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-600">
              Final Call sends after {nudgeFinalCallHours}h if meeting status is unchanged.
              Reason sends {nudgeReasonHours}h after Final Call. Follow Up sends{' '}
              {nudgeFollowUpHours}h after Reason. Updating meeting status stops the sequence.
            </p>
          </div>
        </div>

        <div className="saas-table-wrap">
          <div className="saas-toolbar">
            <input
              className={`${inputClass()} saas-toolbar__search !h-[2.125rem] !py-0 text-xs`}
              placeholder="Search email, name, company…"
              value={processedQuery}
              onChange={(e) => setProcessedQuery(e.target.value)}
            />
            <select
              className={selectClass()}
              value={processedStatus}
              onChange={(e) => setProcessedStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
            <select
              className={selectClass()}
              value={processedMeetingFilter}
              onChange={(e) => setProcessedMeetingFilter(e.target.value)}
            >
              <option value="all">All meetings</option>
              <option value="none">No meeting</option>
              <option value="invited">Invited</option>
              <option value="link_clicked">Link clicked</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="no_show">No show</option>
            </select>
            <select
              className={selectClass()}
              value={processedEngagement}
              onChange={(e) => setProcessedEngagement(e.target.value)}
            >
              <option value="all">All engagement</option>
              <option value="engaged">Opened or meeting click</option>
              <option value="opened">Opened</option>
              <option value="clicked">Link clicked</option>
              <option value="meeting_clicked">Meeting link clicked</option>
            </select>
            <select
              className={selectClass()}
              value={processedCampaignId}
              onChange={(e) => setProcessedCampaignId(e.target.value)}
            >
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.subject || c.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary px-3 text-xs"
              onClick={loadProcessed}
            >
              Refresh
            </button>
            {!selectMode ? (
              <button
                type="button"
                className="ml-auto rounded-lg border border-white/10 px-2.5 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
                style={{ height: '2.125rem' }}
                disabled={!filteredProcessed.length}
                onClick={() => setSelectMode(true)}
              >
                Select
              </button>
            ) : (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-indigo-200">
                  <input
                    type="checkbox"
                    checked={allSelected && filteredProcessed.length > 0}
                    onChange={toggleSelectAll}
                    disabled={!filteredProcessed.length}
                    className="rounded border-white/20"
                  />
                  Select all
                </label>
                {selectedCount > 0 && (
                  <>
                    <span className="text-[10px] text-slate-400">{selectedCount} selected</span>
                    <button
                      type="button"
                      className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => runBulkMailbox('junk')}
                    >
                      Move to Junk
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => runBulkMailbox('restore')}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[10px] font-semibold text-rose-300 disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => runBulkMailbox('delete')}
                    >
                      Delete forever
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/[0.06]"
                  onClick={exitSelectMode}
                >
                  Done
                </button>
              </div>
            )}
          </div>
          <div>
              {filteredProcessed.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500 md:hidden">
                No processed mail yet. Start a campaign from the Campaigns tab.
              </p>
            ) : (
              <div className="mobile-data-cards">
                {filteredProcessed.map((r) => {
                  const displayName =
                    r.name ||
                    r.mergeData?.name ||
                    (r.email ? r.email.split('@')[0] : '') ||
                    '—'
                  return (
                    <div key={r.id} className="mobile-data-card">
                      <div className="flex items-start gap-2">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedMailIds.has(r.id)}
                            onChange={() => toggleMailSelect(r.id)}
                            className="mt-0.5 rounded border-white/20"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="mobile-data-card__title">{displayName}</p>
                          <p className="mobile-data-card__meta">{r.email}</p>
                        </div>
                        <StatusChip status={r.status} />
                      </div>
                      <div className="mobile-data-card__row">
                        <span className="mobile-data-card__label">Company</span>
                        <span className="mobile-data-card__value">
                          {r.company || r.mergeData?.company || '—'}
                        </span>
                      </div>
                      <div className="mobile-data-card__row">
                        <span className="mobile-data-card__label">Opens / Clicks</span>
                        <span className="mobile-data-card__value">
                          {r.openCount || 0} · {r.clickCount || 0}
                        </span>
                      </div>
                      <div className="mobile-data-card__row">
                        <span className="mobile-data-card__label">Meeting</span>
                        <span className="mobile-data-card__value">
                          <select
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                            value={r.meetingStatus || 'none'}
                            onChange={(e) => handleProcessedMeetingStatus(r, e.target.value)}
                            title="Update meeting status (stops remaining auto nudges)"
                          >
                            <option value="none">None</option>
                            {MEETING_STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      </div>
                      {(r.lastNudgeType || r.nudgeAutoStopped) && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          {r.nudgeAutoStopped
                            ? 'Auto nudges stopped'
                            : `Last auto/manual: ${r.lastNudgeType.replace(/_/g, ' ')}`}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-300"
                          onClick={() => {
                            setTab('mailbox')
                            setFolder(r.mailboxFolder === 'junk' ? 'junk' : 'sent')
                            setSelectedId(r.id)
                          }}
                        >
                          View
                        </button>
                        {canShowNudge(r) && (
                          <>
                            <button
                              type="button"
                              className="has-tip rounded-lg bg-sky-500/15 px-2.5 py-1 text-[10px] font-semibold text-sky-200 disabled:opacity-50"
                              disabled={Boolean(nudgeBusyId)}
                              aria-label={NUDGE_TOOLTIPS.follow_up}
                              data-tip={NUDGE_TOOLTIPS.follow_up}
                              onClick={() => handleNudge(r, 'follow_up')}
                            >
                              {nudgeBusyId === `${r.id}:follow_up` ? '…' : 'Follow Up'}
                            </button>
                            <button
                              type="button"
                              className="has-tip rounded-lg bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-200 disabled:opacity-50"
                              disabled={Boolean(nudgeBusyId)}
                              aria-label={NUDGE_TOOLTIPS.final_call}
                              data-tip={NUDGE_TOOLTIPS.final_call}
                              onClick={() => handleNudge(r, 'final_call')}
                            >
                              {nudgeBusyId === `${r.id}:final_call` ? '…' : 'Final Call'}
                            </button>
                            <button
                              type="button"
                              className="has-tip rounded-lg bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-50"
                              disabled={Boolean(nudgeBusyId)}
                              aria-label={NUDGE_TOOLTIPS.reason}
                              data-tip={NUDGE_TOOLTIPS.reason}
                              onClick={() => handleNudge(r, 'reason')}
                            >
                              {nudgeBusyId === `${r.id}:reason` ? '…' : 'Reason'}
                            </button>
                          </>
                        )}
                        {canShowReminder(r) && (
                          <button
                            type="button"
                            className="has-tip rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
                            disabled={Boolean(nudgeBusyId)}
                            aria-label={NUDGE_TOOLTIPS.reminder}
                            data-tip={NUDGE_TOOLTIPS.reminder}
                            onClick={() => handleReminder(r)}
                          >
                            {nudgeBusyId === `${r.id}:reminder`
                              ? '…'
                              : r.meetingReminderSentAt
                                ? 'Re-send reminder'
                                : 'Reminder'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <table className="saas-table saas-table--desktop-only w-full min-w-[1100px] text-left text-xs">
              <thead>
                <tr>
                  {selectMode && (
                    <th className="w-10 px-3 py-2.5">
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Company</th>
                  <th className="px-3 py-2.5">Campaign</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Opens</th>
                  <th className="px-3 py-2.5">Clicks</th>
                  <th className="px-3 py-2.5">Meeting</th>
                  <th className="px-3 py-2.5">Sent</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcessed.length === 0 && (
                  <tr>
                    <td
                      colSpan={selectMode ? 11 : 10}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No processed mail yet. Start a campaign from the Campaigns tab.
                    </td>
                  </tr>
                )}
                {filteredProcessed.map((r) => {
                  const displayName =
                    r.name ||
                    r.mergeData?.name ||
                    (r.email ? r.email.split('@')[0] : '') ||
                    '—'
                  const campaignLabel = r.campaignName || '—'
                  const subjectLabel = r.campaignSubject || r.renderedSubject || ''
                  return (
                    <tr
                      key={r.id}
                      className={
                        selectMode && selectedMailIds.has(r.id) ? 'bg-indigo-500/[0.06]' : ''
                      }
                    >
                      {selectMode && (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedMailIds.has(r.id)}
                            onChange={() => toggleMailSelect(r.id)}
                            className="rounded border-white/20"
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 font-medium text-slate-200">{displayName}</td>
                      <td className="px-3 py-2 text-slate-400">{r.email}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {r.company || r.mergeData?.company || '—'}
                      </td>
                      <td className="max-w-[200px] px-3 py-2">
                        <p className="truncate font-medium text-slate-300" title={campaignLabel}>
                          {campaignLabel}
                        </p>
                        {subjectLabel && subjectLabel !== campaignLabel && (
                          <p className="truncate text-[10px] text-slate-600" title={subjectLabel}>
                            {subjectLabel}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusChip status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-300">{r.openCount || 0}</td>
                      <td className="px-3 py-2 text-slate-300">{r.clickCount || 0}</td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                          value={r.meetingStatus || 'none'}
                          onChange={(e) => handleProcessedMeetingStatus(r, e.target.value)}
                          title="Update meeting status (stops remaining auto nudges)"
                        >
                          <option value="none">None</option>
                          {MEETING_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {r.nudgeAutoStopped ? (
                          <p className="mt-0.5 text-[9px] text-slate-600">Auto stopped</p>
                        ) : r.lastNudgeType ? (
                          <p className="mt-0.5 text-[9px] text-slate-600">
                            Nudge: {r.lastNudgeType.replace(/_/g, ' ')}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                        {fmtTime(r.sentAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.1]"
                            onClick={() => {
                              setTab('mailbox')
                              setFolder(r.mailboxFolder === 'junk' ? 'junk' : 'sent')
                              setSelectedId(r.id)
                            }}
                          >
                            View
                          </button>
                          {canShowNudge(r) && (
                            <>
                              <button
                                type="button"
                                className="has-tip rounded-lg bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-50"
                                disabled={Boolean(nudgeBusyId)}
                                aria-label={NUDGE_TOOLTIPS.follow_up}
                                data-tip={NUDGE_TOOLTIPS.follow_up}
                                onClick={() => handleNudge(r, 'follow_up')}
                              >
                                {nudgeBusyId === `${r.id}:follow_up` ? '…' : 'Follow Up'}
                              </button>
                              <button
                                type="button"
                                className="has-tip rounded-lg bg-violet-500/15 px-2 py-1 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"
                                disabled={Boolean(nudgeBusyId)}
                                aria-label={NUDGE_TOOLTIPS.final_call}
                                data-tip={NUDGE_TOOLTIPS.final_call}
                                onClick={() => handleNudge(r, 'final_call')}
                              >
                                {nudgeBusyId === `${r.id}:final_call` ? '…' : 'Final Call'}
                              </button>
                              <button
                                type="button"
                                className="has-tip rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                                disabled={Boolean(nudgeBusyId)}
                                aria-label={NUDGE_TOOLTIPS.reason}
                                data-tip={NUDGE_TOOLTIPS.reason}
                                onClick={() => handleNudge(r, 'reason')}
                              >
                                {nudgeBusyId === `${r.id}:reason` ? '…' : 'Reason'}
                              </button>
                            </>
                          )}
                          {canShowReminder(r) && (
                            <button
                              type="button"
                              className="has-tip rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                              disabled={Boolean(nudgeBusyId)}
                              aria-label={NUDGE_TOOLTIPS.reminder}
                              data-tip={NUDGE_TOOLTIPS.reminder}
                              onClick={() => handleReminder(r)}
                            >
                              {nudgeBusyId === `${r.id}:reminder`
                                ? '…'
                                : r.meetingReminderSentAt
                                  ? 'Re-send reminder'
                                  : 'Reminder'}
                            </button>
                          )}
                          {r.mailboxFolder === 'junk' ? (
                            <>
                              <button
                                type="button"
                                className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
                                onClick={async () => {
                                  try {
                                    await restoreMailboxFromJunk(r.id)
                                    showToast('Restored to inbox', 'success')
                                    await loadProcessed()
                                    await loadMailbox()
                                  } catch (err) {
                                    showToast(err.message, 'error')
                                  }
                                }}
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/25"
                                onClick={() => {
                                  setConfirmDialog({
                                    title: 'Delete forever?',
                                    message: 'Delete this message forever? This cannot be undone.',
                                    confirmLabel: 'Delete',
                                    onConfirm: async () => {
                                      await deleteMailboxForever(r.id)
                                      showToast('Deleted forever', 'success')
                                      await loadProcessed()
                                      await loadMailbox()
                                    },
                                  })
                                }}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/25"
                              onClick={async () => {
                                try {
                                  await moveMailboxToJunk(r.id)
                                  showToast('Moved to Junk', 'success')
                                  await loadProcessed()
                                  await loadMailbox()
                                } catch (err) {
                                  showToast(err.message, 'error')
                                }
                              }}
                            >
                              Junk
                            </button>
                          )}
                          {r.meetingLink && (
                            <a
                              href={r.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-500/25"
                            >
                              Meet
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Page {processedPage} of {processedTotalPages} · {processedCounts.filtered} matching
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={processedPage <= 1}
                onClick={() => setProcessedPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={processedPage >= processedTotalPages}
                onClick={() =>
                  setProcessedPage((p) => Math.min(processedTotalPages, p + 1))
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>
        </PageScroll>
      )}

      {/* ─── Meetings tab ─── */}
      {tab === 'meetings' && (
        <PageScroll className="space-y-4 pb-8">
          <section className="saas-panel space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Google Calendar</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Connect once, save your booking page once, then sync Meet invites automatically.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {calendarConnected || apiConfig?.gmail?.calendarReady || apiConfig?.gmail?.hasRefreshToken ? (
                  <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                    Calendar connected
                  </span>
                ) : (
                  <Link
                    to="/api-config"
                    className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/15"
                  >
                    Connect in Integrations →
                  </Link>
                )}
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={syncingCalendar || !(calendarConnected || apiConfig?.gmail?.hasRefreshToken)}
                  onClick={handleSyncCalendar}
                >
                  {syncingCalendar ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            </div>

            {calendarAuthBroken && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <span>Google Calendar auth expired. Reconnect Gmail and accept Calendar permissions.</span>
                <Link to="/api-config" className="font-semibold text-amber-50 underline">
                  Reconnect Gmail →
                </Link>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-400">
                Workspace booking URL (saved once for all campaigns)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  className={`${inputClass()} min-w-0 flex-1`}
                  value={bookingUrlDraft}
                  onChange={(e) => setBookingUrlDraft(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/appointments/..."
                />
                <button
                  type="button"
                  className="btn-primary px-3 py-2 text-xs"
                  disabled={savingBooking}
                  onClick={saveWorkspaceBooking}
                >
                  {savingBooking ? 'Saving…' : 'Save'}
                </button>
                {workspaceBooking && (
                  <a
                    href={workspaceBooking}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    Open
                  </a>
                )}
              </div>
              <details className="mt-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-sky-100/90">
                <summary className="cursor-pointer font-semibold text-sky-50">
                  “No availability” is a Google Calendar setting — tap for fix steps
                </summary>
                <div className="mt-2 space-y-1.5">
                  <p>
                    Connecting Calendar lets us create Meet invites and sync bookings. It does{' '}
                    <span className="font-semibold">not</span> open Appointment Schedule slots.
                    Open hours are only controlled inside Google Calendar.
                  </p>
                  <ol className="list-decimal space-y-1 pl-4 text-sky-100/80">
                    <li>
                      Open{' '}
                      <a
                        href="https://calendar.google.com/calendar/u/0/r/appointment"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-sky-200 underline hover:text-white"
                      >
                        Google Calendar → Appointment schedules
                      </a>
                    </li>
                    <li>
                      Edit your “1:1 Meeting” schedule → Availability: every day, full hours (or
                      Copy time to all)
                    </li>
                    <li>
                      Turn off or loosen “Check calendars for availability” if busy events are
                      blocking every slot
                    </li>
                    <li>
                      Scheduling window: min notice near 0, max advance far enough (e.g. 60–120
                      days)
                    </li>
                  </ol>
                  <p className="text-sky-100/70">
                    From this Meetings list you can still Invite any date/time yourself. Guests
                    using the public booking link only see what Google marks as open.
                  </p>
                </div>
              </details>
              <p className="mt-1.5 text-[10px] text-slate-600">
                Paste the public booking link above once — every campaign reuses it. Google does not allow apps to
                create or rewrite Appointment Schedule hours via API.
              </p>
            </div>
          </section>

          <div className="saas-table-wrap">
            <div className="saas-toolbar justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">Scheduled & meeting pipeline</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {meetingsBookedCount} booked · {meetingsTotal} in pipeline · page {meetingsPage}/
                  {meetingsTotalPages}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputClass()} saas-toolbar__search !h-[2.125rem] !max-w-[12rem] !py-0 text-xs`}
                  placeholder="Search lead…"
                  value={meetingsQuery}
                  onChange={(e) => setMeetingsQuery(e.target.value)}
                />
                <select
                  className={selectClass()}
                  value={meetingsStatusFilter}
                  onChange={(e) => setMeetingsStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="invited">Invited</option>
                  <option value="link_clicked">Link clicked</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="no_show">No show</option>
                </select>
                {selectedMeetingIds.size > 0 && (
                  <button
                    type="button"
                    className="rounded-lg bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
                    style={{ height: '2.125rem' }}
                    disabled={meetingRemoveBusy}
                    onClick={() => {
                      const count = selectedMeetingIds.size
                      setConfirmDialog({
                        title: 'Remove from meeting pipeline?',
                        message: `Remove ${count} selected lead${count === 1 ? '' : 's'} from this pipeline? Campaign send history is kept; only meeting status is cleared.`,
                        confirmLabel: meetingRemoveBusy ? 'Removing…' : 'Remove',
                        onConfirm: async () => {
                          setMeetingRemoveBusy(true)
                          try {
                            const res = await removeEmailMeetings([...selectedMeetingIds])
                            setSelectedMeetingIds(new Set())
                            await loadMeetings({ sync: false })
                            showToast(
                              `Removed ${res.removed ?? count} from meeting pipeline`,
                              'success',
                            )
                          } finally {
                            setMeetingRemoveBusy(false)
                          }
                        },
                      })
                    }}
                  >
                    Remove ({selectedMeetingIds.size})
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary px-3 text-xs"
                  onClick={() => loadMeetings({ sync: true })}
                >
                  Refresh + sync
                </button>
              </div>
            </div>

            {unmatchedBookings.length > 0 && (
              <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
                <p className="text-xs font-semibold text-amber-100">
                  Calendar bookings not matched to a lead email ({unmatchedBookings.length})
                </p>
                <ul className="mt-2 space-y-1.5">
                  {unmatchedBookings.slice(0, 8).map((b) => (
                    <li key={b.eventId} className="text-[11px] text-amber-50/90">
                      <span className="font-semibold text-white">{b.slotLabel || b.meetingScheduledAt}</span>
                      {' · '}
                      {b.summary}
                      {b.guests?.length ? ` · ${b.guests.join(', ')}` : ''}
                      {b.meetingLink ? (
                        <>
                          {' · '}
                          <a href={b.meetingLink} target="_blank" rel="noreferrer" className="text-indigo-300 underline">
                            Open
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              {meetings.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">
                  No meeting activity yet. Open this tab to sync Calendar bookings, or tap Refresh +
                  sync.
                </p>
              ) : (
                <div className="mobile-data-cards">
                  {meetings.map((m) => (
                    <div
                      key={m.id}
                      className={`mobile-data-card ${
                        selectedMeetingIds.has(m.id) ? 'ring-1 ring-indigo-500/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-indigo-500"
                          checked={selectedMeetingIds.has(m.id)}
                          onChange={(e) => {
                            setSelectedMeetingIds((prev) => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(m.id)
                              else next.delete(m.id)
                              return next
                            })
                          }}
                          aria-label={`Select ${m.name || m.email}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="mobile-data-card__title">{m.name || '—'}</p>
                          <p className="mobile-data-card__meta">{m.email}</p>
                        </div>
                      </div>
                      <div className="mobile-data-card__row">
                        <span className="mobile-data-card__label">Company</span>
                        <span className="mobile-data-card__value">{m.company || '—'}</span>
                      </div>
                      <div className="mobile-data-card__row">
                        <span className="mobile-data-card__label">Status</span>
                        <span className="mobile-data-card__value">
                          <select
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                            value={m.meetingStatus || 'none'}
                            onChange={(e) => {
                              const meetingStatus = e.target.value
                              updateEmailMeeting(m.id, { meetingStatus })
                                .then(() => loadMeetings({ sync: false }))
                                .catch((err) => showToast(err.message, 'error'))
                            }}
                          >
                            {MEETING_STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      </div>
                      <div className="mt-3 border-t border-white/[0.06] pt-3">
                        <MeetingBookingBlock
                          meeting={m}
                          inviting={invitingId === m.id}
                          canInvite={calendarConnected || apiConfig?.gmail?.hasRefreshToken}
                          onInvite={(when) => handleInviteMeet(m, when)}
                          onSaveNotes={async (meetingNotes) => {
                            try {
                              await updateEmailMeeting(m.id, { meetingNotes })
                              setMeetings((prev) =>
                                prev.map((row) =>
                                  row.id === m.id ? { ...row, meetingNotes } : row,
                                ),
                              )
                            } catch (err) {
                              showToast(err.message, 'error')
                              throw err
                            }
                          }}
                          compact
                        />
                        {canShowReminder(m) && (
                          <button
                            type="button"
                            className="has-tip mt-2 w-full rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
                            disabled={Boolean(nudgeBusyId)}
                            aria-label={NUDGE_TOOLTIPS.reminder}
                            data-tip={NUDGE_TOOLTIPS.reminder}
                            onClick={() => handleReminder(m)}
                          >
                            {nudgeBusyId === `${m.id}:reminder`
                              ? '…'
                              : m.meetingReminderSentAt
                                ? 'Re-send 10‑min reminder'
                                : 'Send 10‑min reminder'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <table className="saas-table saas-table--desktop-only w-full min-w-[980px] text-left text-xs">
                <thead>
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <label className="inline-flex cursor-pointer items-center gap-1.5" title="Select all">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-indigo-500"
                          checked={
                            meetings.length > 0 &&
                            meetings.every((row) => selectedMeetingIds.has(row.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMeetingIds(new Set(meetings.map((row) => row.id)))
                            } else {
                              setSelectedMeetingIds(new Set())
                            }
                          }}
                          aria-label="Select all"
                        />
                        <span className="sr-only">Select all</span>
                      </label>
                    </th>
                    <th className="px-3 py-2.5">Lead</th>
                    <th className="px-3 py-2.5">Company</th>
                    <th className="px-3 py-2.5">Campaign</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Booking · Meet · Admin invite · Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No meeting activity yet. Open this tab to sync Calendar bookings, or click Sync now.
                      </td>
                    </tr>
                  )}
                  {meetings.map((m) => (
                    <tr
                      key={m.id}
                      className={`align-top ${
                        selectedMeetingIds.has(m.id) ? 'bg-indigo-500/[0.06]' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-indigo-500"
                          checked={selectedMeetingIds.has(m.id)}
                          onChange={(e) => {
                            setSelectedMeetingIds((prev) => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(m.id)
                              else next.delete(m.id)
                              return next
                            })
                          }}
                          aria-label={`Select ${m.name || m.email}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-200">{m.name || '—'}</p>
                        <p className="text-slate-500">{m.email}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-400">{m.company || '—'}</td>
                      <td className="max-w-[120px] truncate px-3 py-2 text-slate-500">
                        {m.campaignName || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                          value={m.meetingStatus || 'none'}
                          onChange={(e) => {
                            const meetingStatus = e.target.value
                            updateEmailMeeting(m.id, { meetingStatus })
                              .then(() => loadMeetings({ sync: false }))
                              .catch((err) => showToast(err.message, 'error'))
                          }}
                        >
                          {MEETING_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <MeetingBookingBlock
                          meeting={m}
                          inviting={invitingId === m.id}
                          canInvite={calendarConnected || apiConfig?.gmail?.hasRefreshToken}
                          onInvite={(when) => handleInviteMeet(m, when)}
                          onSaveNotes={async (meetingNotes) => {
                            try {
                              await updateEmailMeeting(m.id, { meetingNotes })
                              setMeetings((prev) =>
                                prev.map((row) =>
                                  row.id === m.id ? { ...row, meetingNotes } : row,
                                ),
                              )
                            } catch (err) {
                              showToast(err.message, 'error')
                              throw err
                            }
                          }}
                        />
                        {canShowReminder(m) && (
                          <button
                            type="button"
                            className="has-tip mt-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                            disabled={Boolean(nudgeBusyId)}
                            aria-label={NUDGE_TOOLTIPS.reminder}
                            data-tip={NUDGE_TOOLTIPS.reminder}
                            onClick={() => handleReminder(m)}
                          >
                            {nudgeBusyId === `${m.id}:reminder`
                              ? '…'
                              : m.meetingReminderSentAt
                                ? 'Re-send reminder'
                                : 'Reminder · 10 min'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
              <p className="text-[11px] text-slate-500">
                Page {meetingsPage} of {meetingsTotalPages} · {meetingsTotal} matching ·{' '}
                {meetingsPageSize} per page
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                  disabled={meetingsPage <= 1}
                  onClick={() => setMeetingsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                  disabled={meetingsPage >= meetingsTotalPages}
                  onClick={() =>
                    setMeetingsPage((p) => Math.min(meetingsTotalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </PageScroll>
      )}

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          try {
            await confirmDialog?.onConfirm?.()
          } catch (err) {
            showToast(err.message || 'Action failed', 'error')
            throw err
          }
        }}
        title={confirmDialog?.title || 'Are you sure?'}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        cancelLabel="Cancel"
        destructive
      />
    </PageShell>
  )
}
