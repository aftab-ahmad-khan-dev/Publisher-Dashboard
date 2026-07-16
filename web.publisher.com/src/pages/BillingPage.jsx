import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
import { useAppData } from '../contexts/AppDataContext'
import { useAuth } from '../contexts/AuthContext'
import {
  activateBillingPayment,
  fetchBillingBanks,
  fetchBillingPayments,
  rejectBillingPayment,
  submitBillingPayment,
  uploadBillingReceipt,
} from '../lib/backendApi'
import { compressImageFileForUpload } from '../lib/bulkParse'
import { PLAN_META } from '../lib/plans'
import { showToast } from '../lib/toast'
import { isPlatformAdmin } from '../lib/admin'

const PLAN_ORDER = ['starter', 'growth', 'pro']

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
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

export default function BillingPage() {
  const { user } = useAuth()
  const { subscription, refreshSubscription } = useAppData()
  const [searchParams] = useSearchParams()
  const initialPlan = searchParams.get('plan')

  const [banks, setBanks] = useState([])
  const [payments, setPayments] = useState([])
  const [planRequested, setPlanRequested] = useState(
    PLAN_ORDER.includes(initialPlan) ? initialPlan : 'growth',
  )
  const [bankMethod, setBankMethod] = useState('ubl')
  const [note, setNote] = useState('')
  const [receiptPreview, setReceiptPreview] = useState('')
  const [receiptMediaId, setReceiptMediaId] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [thankYou, setThankYou] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null)

  const isAdmin = isPlatformAdmin(user?.email) || subscription?.isAdmin
  const selectedBank = useMemo(
    () => banks.find((b) => b.id === bankMethod) || banks[0],
    [banks, bankMethod],
  )

  const loadPayments = async () => {
    const paymentsRes = await fetchBillingPayments().catch(() => ({ payments: [] }))
    setPayments(paymentsRes.payments || [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (isAdmin) {
          await loadPayments()
          return
        }
        const [banksRes, paymentsRes] = await Promise.all([
          fetchBillingBanks(),
          fetchBillingPayments().catch(() => ({ payments: [] })),
        ])
        if (cancelled) return
        setBanks(banksRes.banks || [])
        if (banksRes.banks?.[0] && !banksRes.banks.find((b) => b.id === bankMethod)) {
          setBankMethod(banksRes.banks[0].id)
        }
        setPayments(paymentsRes.payments || [])
      } catch (err) {
        showToast(err.message || 'Could not load billing', 'error')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const copyText = async (text) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied')
    } catch {
      showToast('Could not copy', 'error')
    }
  }

  const onReceiptFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await compressImageFileForUpload(file)
      setReceiptPreview(dataUrl)
      const res = await uploadBillingReceipt(dataUrl)
      setReceiptMediaId(res.id || '')
      setReceiptUrl(res.url || '')
      showToast(res.provider === 'cloudinary' ? 'Receipt uploaded' : 'Receipt uploaded')
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (isAdmin) {
      showToast('Admin accounts already have full access')
      return
    }
    if (!receiptMediaId && !receiptUrl) {
      showToast('Upload a payment receipt first', 'error')
      return
    }
    setSubmitting(true)
    try {
      await submitBillingPayment({
        planRequested,
        bankMethod,
        receiptMediaId,
        receiptUrl,
        note,
      })
      setThankYou(true)
      await refreshSubscription?.()
      await loadPayments()
    } catch (err) {
      showToast(err.message || 'Submit failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const onActivate = async (id) => {
    setBusyId(id)
    try {
      await activateBillingPayment(id)
      showToast('Plan activated', 'success')
      await loadPayments()
    } catch (err) {
      showToast(err.message || 'Activate failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  const onReject = async (id) => {
    const reason = window.prompt('Optional reject reason:') || ''
    setBusyId(id)
    try {
      await rejectBillingPayment(id, reason)
      showToast('Payment rejected')
      await loadPayments()
    } catch (err) {
      showToast(err.message || 'Reject failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  if (isAdmin) {
    const pending = payments.filter((p) => p.status === 'pending')
    return (
      <PageShell>
        <PageHeader
          title="Billing & Payments"
          subtitle="Platform admin — review receipts and activate plans. No payment required for your account."
        />
        <PageScroll className="space-y-6 pb-8">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Signed in as <strong>{user?.email || 'admin'}</strong> — full Pro access unlocked. You are never
            asked to pay. Manage user receipts below (also available under{' '}
            <Link to="/admin/users" className="underline hover:text-white">
              Admin → Users → Payments
            </Link>
            ).
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-400">
            <span>
              Pending:{' '}
              <strong className="text-amber-300">{pending.length}</strong>
            </span>
            <span>
              Total:{' '}
              <strong className="text-white">{payments.length}</strong>
            </span>
          </div>

          {payments.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
              No payment receipts yet. When users upload receipts, they appear here for activation.
            </p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {p.userEmail || p.workspaceId} ·{' '}
                        {PLAN_META[p.planRequested]?.name || p.planRequested}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {p.bankMethod} · {formatWhen(p.createdAt)}
                      </p>
                      {p.note ? <p className="mt-2 text-xs text-slate-400">{p.note}</p> : null}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : p.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => setReceiptPreviewUrl(p.receiptUrl)}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                      >
                        View receipt
                      </button>
                    ) : null}
                    {p.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => onActivate(p.id)}
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Activate plan
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => onReject(p.id)}
                          className="rounded-full border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PageScroll>

        {receiptPreviewUrl && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setReceiptPreviewUrl(null)}
            role="dialog"
          >
            <div className="max-h-[90vh] max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-[#0c1220] p-4">
              <img
                src={receiptPreviewUrl}
                alt="Payment receipt"
                className="max-h-[80vh] w-full object-contain"
              />
              <a
                href={receiptPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-indigo-300"
                onClick={(e) => e.stopPropagation()}
              >
                Open original
              </a>
            </div>
          </div>
        )}
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Billing & Payment"
        subtitle="Transfer to a bank account, upload your receipt, and we activate your plan after review."
      />
      <PageScroll className="space-y-6 pb-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
          Current plan:{' '}
          <span className="font-semibold text-white">
            {PLAN_META[subscription?.plan]?.name || 'No plan'}
          </span>
          {subscription?.status && subscription.status !== 'active' && (
            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-300">
              {subscription.status}
            </span>
          )}
        </div>

        <section>
          <h2 className="font-display text-lg font-bold text-white">Choose a plan</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const t = PLAN_META[id]
              const active = planRequested === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlanRequested(id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <p className="font-display text-base font-bold text-white">{t.name}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-white">
                    ${t.price}
                    <span className="text-sm font-medium text-slate-500">/mo</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-400">{t.blurb}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-white">Pay by bank transfer</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {banks.map((bank) => (
              <button
                key={bank.id}
                type="button"
                onClick={() => setBankMethod(bank.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  bankMethod === bank.id
                    ? 'border-sky-500/40 bg-sky-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <p className="font-semibold text-white">{bank.name}</p>
                <p className="mt-1 text-xs text-slate-400">{bank.accountTitle}</p>
                <p className="mt-2 font-mono text-sm text-slate-200">{bank.accountNumber}</p>
                {bank.iban ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{bank.iban}</p>
                ) : null}
                {bank.branch ? (
                  <p className="mt-1 text-[11px] text-slate-500">{bank.branch}</p>
                ) : null}
              </button>
            ))}
          </div>

          {selectedBank && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText(selectedBank.accountNumber)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
              >
                Copy account / number
              </button>
              {selectedBank.iban ? (
                <button
                  type="button"
                  onClick={() => copyText(selectedBank.iban)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                >
                  Copy IBAN
                </button>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-display text-lg font-bold text-white">Upload receipt</h2>
          <p className="mt-1 text-sm text-slate-400">
            Screenshot or photo of your transfer confirmation (JPG/PNG).
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center hover:border-indigo-500/40">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => onReceiptFile(e.target.files?.[0])}
            />
            {receiptPreview ? (
              <img src={receiptPreview} alt="Receipt preview" className="max-h-48 rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-slate-400">
                {uploading ? 'Uploading…' : 'Click to choose receipt image'}
              </span>
            )}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (transaction ID, sender name…)"
            rows={2}
            className="saas-input mt-4 w-full resize-none"
          />
          <button
            type="button"
            disabled={submitting || uploading}
            onClick={handleSubmit}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit for activation'}
          </button>
        </section>

        {payments.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold text-white">Your submissions</h2>
            <ul className="mt-3 space-y-2">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <span className="text-slate-200">
                    {PLAN_META[p.planRequested]?.name || p.planRequested} · {p.bankMethod}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      p.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : p.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageScroll>

      {thankYou && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#0c1220] p-8 text-center shadow-2xl">
            <h3 className="font-display text-xl font-bold text-white">Thank you!</h3>
            <p className="mt-3 text-sm text-slate-400">
              We received your receipt. A confirmation email is on the way. Once we activate your plan,
              you will get a welcome email and full access unlocks.
            </p>
            <button
              type="button"
              onClick={() => setThankYou(false)}
              className="mt-6 rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
