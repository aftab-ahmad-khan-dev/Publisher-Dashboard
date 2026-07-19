import {
  CRM_MEETING_OUTCOMES,
  LOSS_REASONS,
  PIPELINE_STAGES,
  SALE_TYPES,
  formatMoneyExact,
} from '../../lib/salesConstants'

const fieldClass =
  'w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/40'
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

export default function LeadDrawer({
  open,
  form,
  setForm,
  lead,
  saving,
  teamMembers = [],
  onClose,
  onSave,
  onDelete,
  onTouch,
  isCreate,
}) {
  if (!open) return null

  const setters = teamMembers.filter((m) => m.role === 'setter' || m.role === 'both')
  const closers = teamMembers.filter((m) => m.role === 'closer' || m.role === 'both')
  const earnings =
    ((Number(form.cashCollected) || 0) - (Number(form.refundAmount) || 0)) *
    ((Number(form.commissionPercent) || 0) / 100)

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#0a0c14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isCreate ? 'New lead' : form.name || 'Lead'}
            </h2>
            {!isCreate && lead?.dateCreated ? (
              <p className="text-[11px] text-slate-500">
                Created {new Date(lead.dateCreated).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lead name">
                <input className={fieldClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Company">
                <input className={fieldClass} value={form.company} onChange={(e) => set('company', e.target.value)} />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input className={fieldClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Source">
                <input className={fieldClass} value={form.source} onChange={(e) => set('source', e.target.value)} />
              </Field>
              <Field label="Stage">
                <select
                  className={fieldClass}
                  value={form.pipelineStage}
                  onChange={(e) => set('pipelineStage', e.target.value)}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Setter">
                <input
                  className={fieldClass}
                  list="sales-setters"
                  value={form.setterName}
                  onChange={(e) => set('setterName', e.target.value)}
                />
                <datalist id="sales-setters">
                  {setters.map((m) => (
                    <option key={m.id || m.name} value={m.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Closer">
                <input
                  className={fieldClass}
                  list="sales-closers"
                  value={form.closerName}
                  onChange={(e) => set('closerName', e.target.value)}
                />
                <datalist id="sales-closers">
                  {closers.map((m) => (
                    <option key={m.id || m.name} value={m.name} />
                  ))}
                </datalist>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Dates</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First contact">
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.firstContactAt}
                  onChange={(e) => set('firstContactAt', e.target.value)}
                />
              </Field>
              <Field label="Meeting booked">
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.meetingBookedAt}
                  onChange={(e) => set('meetingBookedAt', e.target.value)}
                />
              </Field>
              <Field label="Date of meeting">
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.meetingDateAt}
                  onChange={(e) => set('meetingDateAt', e.target.value)}
                />
              </Field>
              <Field label="Last touch">
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.lastTouchAt}
                  onChange={(e) => set('lastTouchAt', e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Outcomes</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Meeting status">
                <select
                  className={fieldClass}
                  value={form.crmMeetingOutcome}
                  onChange={(e) => set('crmMeetingOutcome', e.target.value)}
                >
                  {CRM_MEETING_OUTCOMES.map((o) => (
                    <option key={o.id || 'none'} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sale type">
                <select
                  className={fieldClass}
                  value={form.saleType}
                  onChange={(e) => set('saleType', e.target.value)}
                >
                  {SALE_TYPES.map((o) => (
                    <option key={o.id || 'none'} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 pt-5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(form.offerMade)}
                  onChange={(e) => set('offerMade', e.target.checked)}
                  className="rounded border-white/20"
                />
                Offer made
              </label>
              {form.pipelineStage === 'lost' ? (
                <Field label="Loss reason *">
                  <select
                    className={fieldClass}
                    value={form.lossReason}
                    onChange={(e) => set('lossReason', e.target.value)}
                  >
                    <option value="">Select…</option>
                    {LOSS_REASONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Money</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deposit">
                <input
                  type="number"
                  className={fieldClass}
                  value={form.depositAmount}
                  onChange={(e) => set('depositAmount', e.target.value)}
                />
              </Field>
              <Field label="Total deal value">
                <input
                  type="number"
                  className={fieldClass}
                  value={form.totalDealValue}
                  onChange={(e) => set('totalDealValue', e.target.value)}
                />
              </Field>
              <Field label="Cash collected">
                <input
                  type="number"
                  className={fieldClass}
                  value={form.cashCollected}
                  onChange={(e) => set('cashCollected', e.target.value)}
                />
              </Field>
              <Field label="Date paid in full">
                <input
                  type="date"
                  className={fieldClass}
                  value={form.datePaidInFull}
                  onChange={(e) => set('datePaidInFull', e.target.value)}
                />
              </Field>
              <Field label="Refund / clawback">
                <input
                  type="number"
                  className={fieldClass}
                  value={form.refundAmount}
                  onChange={(e) => set('refundAmount', e.target.value)}
                />
              </Field>
              <Field label="Commission %">
                <input
                  type="number"
                  className={fieldClass}
                  value={form.commissionPercent}
                  onChange={(e) => set('commissionPercent', e.target.value)}
                />
              </Field>
            </div>
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-sm text-emerald-200">
              Earnings (auto): {formatMoneyExact(earnings)}
            </p>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] px-4 py-3">
          {!isCreate && onTouch ? (
            <button
              type="button"
              onClick={onTouch}
              className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.04]"
            >
              Mark touched
            </button>
          ) : null}
          {!isCreate && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
            >
              Remove
            </button>
          ) : null}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isCreate ? 'Create lead' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
