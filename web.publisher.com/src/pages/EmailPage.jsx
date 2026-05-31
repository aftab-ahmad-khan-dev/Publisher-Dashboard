import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { isLivePublishing } from '../lib/api'
import { isGmailConfigured } from '../lib/connections'
import {
  createEmailCampaign,
  listEmailCampaigns,
  getEmailCampaign,
  sendEmailCampaign,
  gmailOAuthUrl,
  getEmailTemplateDraft,
  saveEmailTemplateDraft,
} from '../lib/backendApi'
import { parseRecipients, mergeTemplate, MERGE_TAG_HELP, analyzePainFocusedEmail } from '../lib/emailParse'
import { EMAIL_TEMPLATES } from '../lib/emailTemplates'
import { sanitizePublishedText } from '../lib/contentSanitize'
import PainPointEmailGuide from '../components/PainPointEmailGuide'
import RecipientCsvUpload from '../components/RecipientCsvUpload'
import { downloadTextFile } from '../lib/recipientFile'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageScroll } from '../components/PageShell'
import Modal from '../components/Modal'

const SAMPLE_RECIPIENTS = `email,name,company,niche
sarah@acmecorp.com,Sarah Chen,Acme Corp,SaaS
mike@brightlocal.io,Mike Torres,Bright Local,dental marketing
jordan@shopnest.co,Jordan Lee,ShopNest,e-commerce`

const SAMPLE_SUBJECT = EMAIL_TEMPLATES[0].subject
const SAMPLE_BODY = EMAIL_TEMPLATES[0].body

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-slate-500/20 text-slate-400',
    sending: 'bg-amber-500/20 text-amber-300',
    completed: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-rose-500/20 text-rose-400',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status] || styles.draft}`}>
      {status}
    </span>
  )
}

export default function EmailPage() {
  const { apiConfig, showToast } = useAppData()
  const live = isLivePublishing()
  const gmailReady = isGmailConfigured(apiConfig?.gmail)
  // Open tracking needs a publicly reachable API; localhost can't be hit by mail clients.
  const trackingUnreachable =
    live && /localhost|127\.0\.0\.1/.test(import.meta.env.VITE_API_BASE_URL || '')

  const [subject, setSubject] = useState(SAMPLE_SUBJECT)
  const [body, setBody] = useState(SAMPLE_BODY)
  const [recipientsRaw, setRecipientsRaw] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [recipientFileName, setRecipientFileName] = useState('')
  const [trackOpens, setTrackOpens] = useState(true)
  const [templateIndex, setTemplateIndex] = useState(0)
  const [rotateTemplates, setRotateTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingList, setLoadingList] = useState(false)
  const [viewingRecipient, setViewingRecipient] = useState(null)

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw])

  const preview = useMemo(() => {
    if (recipients.length === 0) return null
    const idx = Math.min(previewIndex, recipients.length - 1)
    const data = recipients[idx].mergeData
    return {
      idx,
      recipient: recipients[idx],
      subject: mergeTemplate(subject, data),
      body: mergeTemplate(body, data),
    }
  }, [subject, body, recipients, previewIndex])

  const loadPainSample = () => {
    setRecipientsRaw(SAMPLE_RECIPIENTS)
    setRecipientFileName('sample-recipients.csv')
    setTemplateIndex(0)
    setSubject(EMAIL_TEMPLATES[0].subject)
    setBody(EMAIL_TEMPLATES[0].body)
    setPreviewIndex(0)
  }

  // Load a different template into the composer (cycles through the library).
  const shuffleTemplate = () => {
    const next = (templateIndex + 1) % EMAIL_TEMPLATES.length
    setTemplateIndex(next)
    setSubject(EMAIL_TEMPLATES[next].subject)
    setBody(EMAIL_TEMPLATES[next].body)
  }

  const handleRecipientImport = (text, name) => {
    setRecipientsRaw(text)
    setRecipientFileName(name || '')
    setPreviewIndex(0)
  }

  const downloadTemplate = () => {
    downloadTextFile('recipients-template.csv', SAMPLE_RECIPIENTS)
  }

  const loadCampaigns = useCallback(async () => {
    if (!live) return
    setLoadingList(true)
    try {
      const res = await listEmailCampaigns()
      setCampaigns(res.campaigns || [])
    } catch {
      /* ignore */
    }
    setLoadingList(false)
  }, [live])

  const loadDetail = useCallback(
    async (id) => {
      if (!live || !id) return
      try {
        const res = await getEmailCampaign(id)
        setDetail(res)
        setSelectedId(id)
      } catch (err) {
        showToast(err.message, 'error')
      }
    },
    [live, showToast],
  )

  useEffect(() => {
    loadCampaigns()
    const t = setInterval(loadCampaigns, 8000)
    return () => clearInterval(t)
  }, [loadCampaigns])

  // Show the most recent campaign's email by default (no click needed).
  useEffect(() => {
    if (!selectedId && campaigns.length > 0) {
      loadDetail(campaigns[0].id)
    }
  }, [campaigns, selectedId, loadDetail])

  // Load this user's autosaved composer draft on mount.
  const draftLoaded = useRef(false)
  useEffect(() => {
    if (!live) {
      draftLoaded.current = true
      return undefined
    }
    let cancelled = false
    getEmailTemplateDraft()
      .then((res) => {
        if (cancelled) return
        if (res?.draft && (res.draft.subject || res.draft.body)) {
          setSubject(res.draft.subject || '')
          setBody(res.draft.body || '')
        }
      })
      .catch(() => {})
      .finally(() => {
        draftLoaded.current = true
      })
    return () => {
      cancelled = true
    }
  }, [live])

  // Autosave composer edits to the user's workspace (debounced).
  useEffect(() => {
    if (!live || !draftLoaded.current) return undefined
    const t = setTimeout(() => {
      saveEmailTemplateDraft(subject, body).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [subject, body, live])

  const handleSend = async () => {
    if (!gmailReady) {
      showToast('Connect Gmail in API Config first.', 'error')
      return
    }
    if (!subject.trim() || !body.trim()) {
      showToast('Subject and body are required.', 'error')
      return
    }
    const emailCheck = analyzePainFocusedEmail(subject, body)
    if (emailCheck.issues.some((i) => i.severity === 'error')) {
      showToast(emailCheck.issues.find((i) => i.severity === 'error').message, 'error')
      return
    }
    if (recipients.length === 0) {
      showToast('Add at least one recipient.', 'error')
      return
    }
    if (!live) {
      showToast('Set VITE_API_BASE_URL to send email.', 'error')
      return
    }

    setSending(true)
    try {
      const wrapHtml = (raw) =>
        `<div style="font-family:sans-serif;line-height:1.5">${sanitizePublishedText(
          raw.includes('<') ? raw : raw.replace(/\n/g, '<br>\n'),
        )}</div>`
      const cleanSubject = sanitizePublishedText(subject)
      const cleanBody = sanitizePublishedText(body)
      // When rotation is on, send the whole library so each recipient gets a random template.
      const templates = rotateTemplates
        ? EMAIL_TEMPLATES.map((t) => ({
            subject: sanitizePublishedText(t.subject),
            textBody: sanitizePublishedText(t.body),
            htmlBody: wrapHtml(t.body),
          }))
        : []
      const res = await createEmailCampaign({
        subject: cleanSubject,
        htmlBody: wrapHtml(body),
        textBody: cleanBody,
        templates,
        recipients,
        trackOpens,
        sendNow: true,
        batchSize: 25,
        batchDelayMs: 3000,
      })
      showToast(
        rotateTemplates
          ? `Sending to ${res.recipientCount} recipients — rotating ${EMAIL_TEMPLATES.length} templates`
          : `Sending to ${res.recipientCount} recipients via Gmail…`,
      )
      await loadCampaigns()
      if (res.campaign?.id) loadDetail(res.campaign.id)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSending(false)
  }

  const connectGmail = async () => {
    const url = await gmailOAuthUrl()
    if (url) window.location.href = url
    else showToast('API URL not configured', 'error')
  }

  return (
    <PageShell>
      <PageHeader
        title="Bulk Email"
        subtitle="One pain-first template · personalized per name, company & niche"
        action={
          <Link to="/api-config" className="btn-secondary px-3 py-1.5 text-xs">
            Gmail setup
          </Link>
        }
      />

      <PageBody className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <PageScroll className="space-y-3">
          {!gmailReady && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
              <p className="text-sm font-medium text-amber-200">Connect Gmail</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Bulk mail sends through your Gmail account (same as Mailsuite). Messages land in Sent so your
                Mailsuite extension can show opens/clicks in Gmail.
              </p>
              <button type="button" onClick={connectGmail} className="btn-primary mt-3 text-xs">
                Connect Gmail
              </button>
            </div>
          )}

          <PainPointEmailGuide subject={subject} body={body} />

          <section className="surface-panel rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">
                Compose
                <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                  template {templateIndex + 1}/{EMAIL_TEMPLATES.length}
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={loadPainSample} className="text-[11px] text-violet-400 hover:text-violet-300">
                  Load pain-first sample
                </button>
                <button
                  type="button"
                  onClick={shuffleTemplate}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08]"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                  Shuffle template
                </button>
              </div>
            </div>
            <label className="mt-2 flex items-start gap-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={rotateTemplates}
                onChange={(e) => setRotateTemplates(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded"
              />
              <span>
                <span className="font-medium text-violet-200">Rotate all {EMAIL_TEMPLATES.length} templates on send</span> — each
                recipient gets a randomly chosen template (great for bulk deliverability).
              </span>
            </label>
            <details className="mt-2 text-[11px] text-slate-500">
              <summary className="cursor-pointer text-violet-400/90">Merge tags for recipients</summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {MERGE_TAG_HELP.map(({ tag, desc }) => (
                  <li key={tag}>
                    <code className="text-slate-400">{tag}</code>
                    <span className="text-slate-600"> — {desc}</span>
                  </li>
                ))}
              </ul>
            </details>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. A {{niche}} challenge teams at {{company}} see"
              className="input-premium mt-3 w-full text-sm"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Email body…"
              className="input-premium mt-2 w-full resize-y font-mono text-xs leading-relaxed"
            />
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={trackOpens}
                onChange={(e) => setTrackOpens(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Track opens in Publisher Suite dashboard (tracking pixel)
            </label>
            {apiConfig?.gmail?.fromEmail && (
              <p className="mt-2 text-[11px] text-slate-500">
                From: <span className="text-slate-300">{apiConfig.gmail.fromEmail}</span>
              </p>
            )}
          </section>

          <section className="surface-panel rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Recipients</h2>
              <button type="button" onClick={downloadTemplate} className="text-[11px] text-violet-400">
                Download template
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Upload your list from Google Sheets / Excel (export as CSV). Columns:{' '}
              <code className="text-slate-400">email</code>, <code className="text-slate-400">name</code>,{' '}
              <code className="text-slate-400">company</code>, <code className="text-slate-400">niche</code>
            </p>

            <div className="mt-3">
              <RecipientCsvUpload
                fileName={recipientFileName}
                recipientCount={recipients.length}
                templateCsv={SAMPLE_RECIPIENTS}
                onImport={handleRecipientImport}
                onClear={() => {
                  setRecipientsRaw('')
                  setRecipientFileName('')
                  setPreviewIndex(0)
                }}
              />
            </div>

            <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-slate-600">
              Or paste / edit
            </p>
            <textarea
              value={recipientsRaw}
              onChange={(e) => {
                setRecipientsRaw(e.target.value)
                setRecipientFileName('')
                setPreviewIndex(0)
              }}
              rows={6}
              placeholder={'email,name,company,niche\ncontact@firm.com,Jane Doe,Acme Inc,real estate'}
              className="input-premium mt-1 w-full resize-y font-mono text-xs"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              {recipients.length} unique recipient{recipients.length === 1 ? '' : 's'}
            </p>
            {recipients.length > 0 && (
              <div className="mt-2 max-h-32 overflow-x-auto overflow-y-auto rounded-lg border border-white/[0.06]">
                <table className="w-full min-w-[360px] text-left text-[10px]">
                  <thead className="bg-black/30 text-slate-500">
                    <tr>
                      <th className="px-2 py-1">Email</th>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Company</th>
                      <th className="px-2 py-1">Niche</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.slice(0, 8).map((r) => (
                      <tr key={r.email} className="border-t border-white/[0.04] text-slate-400">
                        <td className="truncate px-2 py-1 max-w-[100px]">{r.email}</td>
                        <td className="px-2 py-1">{r.name || '—'}</td>
                        <td className="px-2 py-1">{r.company || '—'}</td>
                        <td className="px-2 py-1">{r.niche || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recipients.length > 8 && (
                  <p className="px-2 py-1 text-[10px] text-slate-600">+{recipients.length - 8} more</p>
                )}
              </div>
            )}
          </section>

          {preview && (
            <section className="surface-panel rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Preview for recipient
                </h2>
                {recipients.length > 1 && (
                  <select
                    value={preview.idx}
                    onChange={(e) => setPreviewIndex(Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-300"
                  >
                    {recipients.map((r, i) => (
                      <option key={r.email} value={i}>
                        {r.name || r.email}
                        {r.company ? ` · ${r.company}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                {preview.recipient.email}
                {preview.recipient.niche ? ` · ${preview.recipient.niche}` : ''}
                {recipients.length > 1 ? ' · Each recipient gets a unique spintax + paragraph order' : ''}
              </p>
              <p className="mt-2 text-sm font-medium text-white">{preview.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{preview.body}</p>
            </section>
          )}

          <button
            type="button"
            disabled={sending || !gmailReady}
            onClick={handleSend}
            className="btn-primary w-full py-3 text-sm disabled:opacity-50"
          >
            {sending ? 'Starting send…' : `Send to ${recipients.length || 0} recipients`}
          </button>
        </PageScroll>

        <PageScroll className="space-y-3">
          <section className="surface-panel min-h-[200px] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Campaigns & delivery</h2>
              <button type="button" onClick={loadCampaigns} className="text-[11px] text-violet-400">
                {loadingList ? '…' : 'Refresh'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Sent / opened / failed counts. For Mailsuite tracking, check Gmail Sent folder with extension enabled.
            </p>
            {trackingUnreachable && (
              <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
                <span className="font-medium text-amber-200">Opens can’t be tracked on localhost.</span> Mail clients
                can’t reach a local API, so the open pixel never loads and counts stay 0. Set{' '}
                <code className="rounded bg-black/30 px-1 text-amber-200/90">API_PUBLIC_URL</code> on the server to a
                public URL (deploy, or an ngrok/cloudflared tunnel) to count opens. See the{' '}
                <Link to="/guide" className="font-medium text-violet-300 hover:text-violet-200">Setup Guide</Link>.
              </div>
            )}

            {campaigns.length === 0 ? (
              <p className="mt-8 text-center text-xs text-slate-500">No campaigns yet</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => loadDetail(c.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        selectedId === c.id
                          ? 'border-violet-500/40 bg-violet-500/10'
                          : 'border-white/[0.06] bg-black/20 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{c.subject}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                        <span>
                          <span className="text-emerald-400">{c.stats?.sent ?? 0}</span> sent
                        </span>
                        <span>
                          <span className="text-sky-400">{c.stats?.opened ?? 0}</span> opened
                        </span>
                        <span>
                          <span className="text-rose-400">{c.stats?.failed ?? 0}</span> failed
                        </span>
                        <span>of {c.stats?.total ?? 0}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail?.campaign && (
            <section className="surface-panel rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white">Original email</h2>
              <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-slate-600">Subject</p>
              <p className="mt-0.5 text-sm font-medium text-white">{detail.campaign.subject}</p>
              <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-slate-600">Body</p>
              <div className="mt-1 max-h-[280px] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                  {detail.campaign.textBody?.trim() ||
                    detail.campaign.htmlBody?.replace(/<[^>]+>/g, '').trim() ||
                    'No body content'}
                </p>
              </div>
              <p className="mt-2 text-[10px] text-slate-600">
                Template with merge tags — click any recipient below to see the exact email they received.
              </p>
            </section>
          )}

          {detail?.recipients && (
            <section className="surface-panel rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white">Recipient delivery</h2>
              <div className="mt-2 max-h-[320px] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[420px] text-left text-[11px]">
                  <thead className="sticky top-0 bg-[#0a0c12] text-slate-500">
                    <tr>
                      <th className="py-1 pr-2">Email</th>
                      <th className="py-1 pr-2">Company</th>
                      <th className="py-1 pr-2">Status</th>
                      <th className="py-1 pr-2">Opens</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recipients.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setViewingRecipient(r)}
                        className="cursor-pointer border-t border-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="py-1.5 pr-2 truncate max-w-[120px]">{r.email}</td>
                        <td className="py-1.5 pr-2 truncate max-w-[80px] text-slate-500">{r.company || r.niche || '—'}</td>
                        <td className="py-1.5 pr-2">
                          <span
                            className={
                              r.status === 'sent' || r.status === 'opened'
                                ? 'text-emerald-400'
                                : r.status === 'failed'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-1.5 pr-2">{r.openCount || (r.openedAt ? 1 : 0)}</td>
                        <td className="py-1.5 text-right text-violet-300">View</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.campaign?.status === 'draft' && (
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full text-xs"
                  onClick={async () => {
                    await sendEmailCampaign(detail.campaign.id)
                    showToast('Sending started')
                    loadDetail(detail.campaign.id)
                    loadCampaigns()
                  }}
                >
                  Send campaign
                </button>
              )}
            </section>
          )}
        </PageScroll>
      </PageBody>

      <SentEmailModal
        recipient={viewingRecipient}
        campaign={detail?.campaign}
        onClose={() => setViewingRecipient(null)}
      />
    </PageShell>
  )
}

/** Shows the exact personalized email a recipient received. Falls back to a
 *  best-effort merge of the template for campaigns sent before render storage. */
function SentEmailModal({ recipient, campaign, onClose }) {
  if (!recipient) return null

  const data = {
    ...(recipient.mergeData || {}),
    email: recipient.email,
    name: recipient.name,
    company: recipient.company,
    niche: recipient.niche,
  }
  const hasStored = !!(recipient.renderedSubject || recipient.renderedText || recipient.renderedHtml)

  const subject = hasStored
    ? recipient.renderedSubject
    : mergeTemplate(campaign?.subject || '', data)

  const templateBody =
    campaign?.textBody?.trim() || campaign?.htmlBody?.replace(/<[^>]+>/g, '').trim() || ''
  const body = hasStored
    ? recipient.renderedText || recipient.renderedHtml?.replace(/<[^>]+>/g, '').trim() || ''
    : mergeTemplate(templateBody, data)

  return (
    <Modal open={!!recipient} onClose={onClose} title="Sent email">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-white">{recipient.email}</span>
          {recipient.company && <span>· {recipient.company}</span>}
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              hasStored
                ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25'
                : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25'
            }`}
          >
            {hasStored ? 'Exact copy sent' : 'Reconstructed from template'}
          </span>
        </div>

        <div>
          <p className="field-label">Subject</p>
          <p className="text-sm font-medium text-white">{subject || '—'}</p>
        </div>

        <div>
          <p className="field-label">Body</p>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
              {body || 'No body content'}
            </p>
          </div>
        </div>

        {!hasStored && (
          <p className="text-[10px] text-slate-600">
            This campaign was sent before per-recipient copies were stored, so spintax choices
            may differ from what was actually delivered. Newly sent campaigns show the exact copy.
          </p>
        )}
      </div>
    </Modal>
  )
}
