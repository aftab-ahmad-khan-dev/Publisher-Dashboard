import { useCallback, useEffect, useMemo, useState } from 'react'
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
} from '../lib/backendApi'
import { parseRecipients, mergeTemplate, MERGE_TAG_HELP, analyzePainFocusedEmail } from '../lib/emailParse'
import { sanitizePublishedText } from '../lib/contentSanitize'
import PainPointEmailGuide from '../components/PainPointEmailGuide'
import RecipientCsvUpload from '../components/RecipientCsvUpload'
import { downloadTextFile } from '../lib/recipientFile'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageScroll } from '../components/PageShell'

const SAMPLE_RECIPIENTS = `email,name,company,niche
sarah@acmecorp.com,Sarah Chen,Acme Corp,SaaS
mike@brightlocal.io,Mike Torres,Bright Local,dental marketing
jordan@shopnest.co,Jordan Lee,ShopNest,e-commerce`

const SAMPLE_SUBJECT = `A {{niche}} ops pattern teams at {{company}} run into`

const SAMPLE_BODY = `{{greeting}},

{{painOpener}} often hit the same bottleneck: {growth stalls because manual follow-up eats the week|manual follow-up quietly caps growth|the week disappears into follow-up instead of closing}.

I have been mapping {what separates teams that fix that quietly vs. teams that stay stuck|which teams break through vs. plateau|the pattern behind teams that recover vs. stay in the grind}. No pitch, just the pattern.

If it resonates at {{companyLabel}}, happy to share the one-pager.

{Worth a quick reply?|Open to a quick reply?|Would a short reply be useful?}

Alex`

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

  const [subject, setSubject] = useState(SAMPLE_SUBJECT)
  const [body, setBody] = useState(SAMPLE_BODY)
  const [recipientsRaw, setRecipientsRaw] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [recipientFileName, setRecipientFileName] = useState('')
  const [trackOpens, setTrackOpens] = useState(true)
  const [sending, setSending] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingList, setLoadingList] = useState(false)

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
    setSubject(SAMPLE_SUBJECT)
    setBody(SAMPLE_BODY)
    setPreviewIndex(0)
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
      const htmlBody = body.includes('<') ? body : body.replace(/\n/g, '<br>\n')
      const cleanSubject = sanitizePublishedText(subject)
      const cleanBody = sanitizePublishedText(body)
      const res = await createEmailCampaign({
        subject: cleanSubject,
        htmlBody: `<div style="font-family:sans-serif;line-height:1.5">${sanitizePublishedText(htmlBody)}</div>`,
        textBody: cleanBody,
        recipients,
        trackOpens,
        sendNow: true,
        batchSize: 25,
        batchDelayMs: 3000,
      })
      showToast(`Sending to ${res.recipientCount} recipients via Gmail…`)
      await loadCampaigns()
      if (res.campaign?.id) loadDetail(res.campaign.id)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSending(false)
  }

  const connectGmail = () => {
    const url = gmailOAuthUrl()
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
              <h2 className="text-sm font-semibold text-white">Compose (one template)</h2>
              <button type="button" onClick={loadPainSample} className="text-[11px] text-violet-400">
                Load pain-first sample
              </button>
            </div>
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
              Track opens in Pulse dashboard (tracking pixel)
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
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-left text-[10px]">
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

          {detail?.recipients && (
            <section className="surface-panel rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white">Recipient delivery</h2>
              <div className="mt-2 max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-[#0a0c12] text-slate-500">
                    <tr>
                      <th className="py-1 pr-2">Email</th>
                      <th className="py-1 pr-2">Company</th>
                      <th className="py-1 pr-2">Status</th>
                      <th className="py-1">Opens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recipients.map((r) => (
                      <tr key={r.id} className="border-t border-white/[0.04] text-slate-400">
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
                        <td className="py-1.5">{r.openCount || (r.openedAt ? 1 : 0)}</td>
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
    </PageShell>
  )
}
