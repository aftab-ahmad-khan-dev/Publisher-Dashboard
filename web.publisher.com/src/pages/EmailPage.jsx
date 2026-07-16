import { useCallback, useEffect, useMemo, useState } from 'react'
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
  listEmailTemplates,
  listProcessedEmails,
  listEmailMeetings,
  updateEmailMeeting,
  fetchEmailMailbox,
  fetchEmailMailboxMessage,
  moveMailboxToJunk,
  restoreMailboxFromJunk,
  deleteMailboxForever,
  bulkMailboxAction,
  createCalendarInvite,
  syncEmailCalendar,
  saveCalendarSettings,
} from '../lib/backendApi'
import { mergeTemplate } from '../lib/emailParse'
import {
  OUTREACH_TEMPLATES,
  PRODUCT_TEMPLATES,
  SIGNATURE,
} from '../lib/emailTemplates'
import LeadSourcePanel from '../components/email/LeadSourcePanel'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'

const TABS = [
  { id: 'mailbox', label: 'Mail Box' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'processed', label: 'Processed mail' },
  { id: 'meetings', label: 'Meetings' },
]

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

function fmtTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function inputClass() {
  return 'saas-input'
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

  const [folder, setFolder] = useState('sent')
  const [mailboxQuery, setMailboxQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [folderCounts, setFolderCounts] = useState({})
  const [sent24h, setSent24h] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [selectedMailIds, setSelectedMailIds] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [selectMode, setSelectMode] = useState(false)

  const [mode, setMode] = useState('bulk')
  const [templateType, setTemplateType] = useState('outreach')
  const [apiTemplates, setApiTemplates] = useState([])
  const [templateId, setTemplateId] = useState(OUTREACH_TEMPLATES[0].id)
  const [subject, setSubject] = useState(OUTREACH_TEMPLATES[0].subject)
  const [body, setBody] = useState(OUTREACH_TEMPLATES[0].body)
  const [htmlBody, setHtmlBody] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [cooldownMinutes, setCooldownMinutes] = useState(8)
  const [dailyCap, setDailyCap] = useState(200)
  const [skipAlreadyEmailed, setSkipAlreadyEmailed] = useState(true)
  const [leadPayload, setLeadPayload] = useState(null)
  const [singleTo, setSingleTo] = useState('')
  const [singleName, setSingleName] = useState('')
  const [sending, setSending] = useState(false)
  const [processedQuery, setProcessedQuery] = useState('')

  const templateList = useMemo(() => {
    const fromApi = apiTemplates.filter((t) => t.type === templateType)
    if (fromApi.length) return fromApi
    const fallback = templateType === 'product' ? PRODUCT_TEMPLATES : OUTREACH_TEMPLATES
    return fallback.map((t) => ({ ...t, textBody: t.body, htmlBody: '' }))
  }, [apiTemplates, templateType])

  const loadCampaigns = useCallback(async () => {
    if (!live) return
    try {
      const data = await listEmailCampaigns()
      setCampaigns(data.campaigns || [])
    } catch {
      /* ignore */
    }
  }, [live])

  const loadProcessed = useCallback(async () => {
    if (!live) return
    try {
      const data = await listProcessedEmails({ limit: 250 })
      setProcessed(data.rows || [])
    } catch (err) {
      showToast(err.message, 'error')
    }
  }, [live, showToast])

  const loadMeetings = useCallback(async () => {
    if (!live) return
    try {
      const data = await listEmailMeetings({ limit: 200 })
      setMeetings(data.meetings || [])
      if (data.meetingLink) setGlobalMeetingLink(data.meetingLink)
      if (data.calendarBookingUrl != null) setBookingUrlDraft(data.calendarBookingUrl || data.meetingLink || '')
      if (typeof data.calendarConnected === 'boolean') {
        setCalendarConnected(data.calendarConnected)
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }, [live, showToast])

  const loadMailbox = useCallback(async () => {
    if (!live) return
    try {
      const data = await fetchEmailMailbox({
        folder,
        q: mailboxQuery,
        limit: 80,
      })
      setMessages(data.recipients || [])
      setFolderCounts(data.folderCounts || {})
      setSent24h(data.sent24h || 0)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }, [live, folder, mailboxQuery, showToast])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadCampaigns(),
      loadProcessed(),
      loadMeetings(),
      loadMailbox(),
    ])
  }, [loadCampaigns, loadProcessed, loadMeetings, loadMailbox])

  useEffect(() => {
    refreshAll()
    const t = setInterval(refreshAll, 12000)
    return () => clearInterval(t)
  }, [refreshAll])

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
        if (s.defaults?.dailyCap) setDailyCap(s.defaults.dailyCap)
      })
      .catch(() => {})
    listEmailTemplates({ meetingLink: meetingLink || globalMeetingLink })
      .then((d) => setApiTemplates(d.templates || []))
      .catch(() => {})
  }, [live, meetingLink, globalMeetingLink])

  const workspaceBooking = (globalMeetingLink || meetingLink || bookingUrlDraft || '').trim()

  const saveWorkspaceBooking = async () => {
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
      showToast(
        data.updated
          ? `Synced ${data.updated} meeting${data.updated === 1 ? '' : 's'} from Google Calendar.`
          : `No new matches (${data.eventsScanned || 0} events scanned).`,
        'success',
      )
      await loadMeetings()
    } catch (err) {
      const msg = err.message || 'Sync failed'
      showToast(msg, 'error')
      if (/Reconnect Gmail|auth failed|invalid authentication/i.test(msg)) {
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
      await createCalendarInvite({
        recipientId: m.id,
        startIso,
        durationMinutes: 30,
        summary: `Meeting with ${m.name || m.email}`,
      })
      showToast('Google Meet invite sent and saved on this lead.', 'success')
      await loadMeetings()
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
        fomoLine: 'Teams in Stockholm, Sweden are already moving on this',
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
    return {
      subject: mergeTemplate(subject, data),
      body: mergeTemplate(body, data),
      html: htmlBody ? mergeTemplate(htmlBody, data) : '',
    }
  }, [subject, body, htmlBody, leadPayload, singleName, workspaceBooking])

  const estFinish = useMemo(() => {
    const n = mode === 'single' ? 1 : leadPayload?.leads?.length || 0
    if (!n) return null
    const mins = Math.max(cooldownMinutes, Math.ceil((24 * 60) / Math.max(dailyCap, 1)))
    const totalMin = (n - 1) * mins
    const hours = Math.floor(totalMin / 60)
    const rem = totalMin % 60
    return hours > 0 ? `~${hours}h ${rem}m` : `~${rem}m`
  }, [mode, leadPayload, cooldownMinutes, dailyCap])

  const filteredProcessed = useMemo(() => {
    const q = processedQuery.trim().toLowerCase()
    if (!q) return processed
    return processed.filter(
      (r) =>
        r.email?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q) ||
        r.campaignName?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q),
    )
  }, [processed, processedQuery])

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
  }, [folder, tab, processedQuery, mailboxQuery])

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
      if (
        !window.confirm(
          `Delete ${ids.length} message${ids.length === 1 ? '' : 's'} forever? This cannot be undone.`,
        )
      ) {
        return
      }
    }
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
            fomoLine: 'Teams in your market are already moving on this',
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
    const primary = {
      name: 'Selected',
      subject,
      textBody: body,
      htmlBody: sendHtml,
    }

    setSending(true)
    try {
      await runWithLoading(
        'Starting campaign…',
        async () => {
          await createEmailCampaign({
            name: `${templateType === 'product' ? 'VorksPro' : templateType === 'outreach' ? 'Outreach' : 'Email'} · ${new Date().toLocaleDateString()}`,
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
            cooldownMinutes: mode === 'single' ? 1 : cooldownMinutes,
            dailyCap,
          })
          await saveEmailTemplateDraft(subject, body, { meetingLink: booking, templateType })
        },
        { blocking: mode === 'bulk' && recipients.length > 5 },
      )
      showToast(
        mode === 'single'
          ? 'Email queued'
          : `Campaign started · ${recipients.length} leads · ${cooldownMinutes} min cooldown`,
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
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <input
                value={mailboxQuery}
                onChange={(e) => setMailboxQuery(e.target.value)}
                placeholder="Search mail"
                className="saas-input min-w-0 flex-1 py-1.5 text-xs"
              />
              {!selectMode ? (
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
                  disabled={!messages.length}
                  onClick={() => setSelectMode(true)}
                >
                  Select
                </button>
              ) : (
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-semibold text-slate-400 hover:bg-white/[0.06]"
                  onClick={exitSelectMode}
                >
                  Done
                </button>
              )}
              <select
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-slate-300 sm:hidden"
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
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    'Delete this message forever? This cannot be undone.',
                                  )
                                ) {
                                  return
                                }
                                try {
                                  await deleteMailboxForever(detail.recipient.id)
                                  showToast('Deleted forever', 'success')
                                  setSelectedId(null)
                                  setDetail(null)
                                  await loadMailbox()
                                } catch (err) {
                                  showToast(err.message, 'error')
                                }
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
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 saas-panel">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Lead source</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Upload Excel or link a Google Sheet, then start the campaign.
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

              <div className="mb-3 flex flex-wrap gap-1.5">
                {['outreach', 'product'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemplateType(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                      templateType === t
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-white/[0.04] text-slate-500'
                    }`}
                  >
                    {t === 'product' ? 'VorksPro' : 'Outreach'}
                  </button>
                ))}
                {templateList.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={`rounded-md px-2 py-1 text-[10px] ${
                      templateId === t.id
                        ? 'bg-white/10 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
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
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Cooldown (min)</label>
                    <input
                      type="number"
                      min={7}
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
              <h3 className="mb-3 text-sm font-semibold text-white">Active campaigns</h3>
              {activeCampaigns.length === 0 && (
                <p className="text-xs text-slate-500">No running campaigns. Start one from the left.</p>
              )}
              <div className="space-y-2">
                {activeCampaigns.map((c) => (
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
              </div>

              {campaigns.filter((c) => !['sending', 'paused', 'draft'].includes(c.status)).length >
                0 && (
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Recent
                  </p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {campaigns
                      .filter((c) => !['sending', 'paused', 'draft'].includes(c.status))
                      .slice(0, 8)
                      .map((c) => (
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
      )}

      {/* ─── Processed mail table ─── */}
      {tab === 'processed' && (
        <div className="saas-table-wrap flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <input
              className={`${inputClass()} max-w-xs`}
              placeholder="Search email, name, company…"
              value={processedQuery}
              onChange={(e) => setProcessedQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={loadProcessed}
            >
              Refresh
            </button>
            <span className="text-[11px] text-slate-500">{filteredProcessed.length} rows</span>
            {!selectMode ? (
              <button
                type="button"
                className="ml-auto rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
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
          <div className="saas-scroll min-h-0 flex-1 overflow-auto">
            <table className="saas-table w-full min-w-[1100px] text-left text-xs">
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
                        <StatusChip status={r.meetingStatus || 'none'} />
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
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      'Delete this message forever? This cannot be undone.',
                                    )
                                  ) {
                                    return
                                  }
                                  try {
                                    await deleteMailboxForever(r.id)
                                    showToast('Deleted forever', 'success')
                                    await loadProcessed()
                                    await loadMailbox()
                                  } catch (err) {
                                    showToast(err.message, 'error')
                                  }
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
        </div>
      )}

      {/* ─── Meetings tab ─── */}
      {tab === 'meetings' && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
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
              <p className="mt-1.5 text-[10px] text-slate-600">
                Google cannot create Appointment Schedule pages via API. Create one in{' '}
                <a
                  href="https://calendar.google.com/calendar/u/0/r/appointment"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  Google Calendar → Appointment schedules
                </a>
                , paste the public link here once, then every VorksPro campaign reuses it.
              </p>
            </div>
          </section>

          <div className="saas-table-wrap min-h-0 flex-1 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Scheduled & meeting pipeline</h3>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={loadMeetings}
              >
                Refresh
              </button>
            </div>
            <div className="saas-scroll min-h-0 flex-1 overflow-auto">
              <table className="saas-table w-full min-w-[1100px] text-left text-xs">
                <thead>
                  <tr>
                    <th className="px-3 py-2.5">Lead</th>
                    <th className="px-3 py-2.5">Company</th>
                    <th className="px-3 py-2.5">Campaign</th>
                    <th className="px-3 py-2.5">Meeting status</th>
                    <th className="px-3 py-2.5">Schedule / Meet</th>
                    <th className="px-3 py-2.5">Meeting link</th>
                    <th className="px-3 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        No meeting activity yet. Product campaigns mark leads as invited; Sync pulls
                        booked Calendar events; Invite with Meet creates a 1:1.
                      </td>
                    </tr>
                  )}
                  {meetings.map((m) => (
                    <tr key={m.id} className="align-top">
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
                              .then(() => loadMeetings())
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
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="datetime-local"
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                            defaultValue={
                              m.meetingScheduledAt
                                ? new Date(m.meetingScheduledAt).toISOString().slice(0, 16)
                                : ''
                            }
                            id={`meet-dt-${m.id}`}
                            onBlur={(e) => {
                              if (!e.target.value) return
                              updateEmailMeeting(m.id, {
                                meetingStatus: 'scheduled',
                                meetingScheduledAt: new Date(e.target.value).toISOString(),
                              })
                                .then(() => loadMeetings())
                                .catch((err) => showToast(err.message, 'error'))
                            }}
                          />
                          <button
                            type="button"
                            className="rounded-lg bg-indigo-500/20 px-2 py-1 text-[10px] font-semibold text-indigo-200 ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-50"
                            disabled={
                              invitingId === m.id ||
                              !(calendarConnected || apiConfig?.gmail?.hasRefreshToken)
                            }
                            onClick={() => {
                              const el = document.getElementById(`meet-dt-${m.id}`)
                              handleInviteMeet(m, el?.value)
                            }}
                          >
                            {invitingId === m.id ? 'Inviting…' : 'Invite with Meet'}
                          </button>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-3 py-2">
                        {m.meetingLink ? (
                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-indigo-300 hover:underline"
                          >
                            {m.meetingLink}
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-40 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                          defaultValue={m.meetingNotes || ''}
                          placeholder="Notes…"
                          onBlur={(e) => {
                            if (e.target.value === (m.meetingNotes || '')) return
                            updateEmailMeeting(m.id, { meetingNotes: e.target.value })
                              .then(() => loadMeetings())
                              .catch((err) => showToast(err.message, 'error'))
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
