import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
import SalesBoard from '../components/sales/SalesBoard'
import LeadLog from '../components/sales/LeadLog'
import LeadDrawer from '../components/sales/LeadDrawer'
import SalesDashboard from '../components/sales/SalesDashboard'
import SalesProjection from '../components/sales/SalesProjection'
import TeamSettings from '../components/sales/TeamSettings'
import { LOSS_REASONS, emptyLeadForm, formToPayload, leadToForm } from '../lib/salesConstants'
import {
  listSalesLeads,
  createSalesLead,
  updateSalesLead,
  touchSalesLead,
  deleteSalesLead,
  fetchSalesMetrics,
  fetchSalesProjection,
  fetchSalesTeam,
  acceptSalesTeamInvite,
  fetchSalesImportable,
  importSalesMeetings,
} from '../lib/backendApi'
import { useAppData } from '../contexts/AppDataContext'
import { planAllowsFeature, effectivePlan } from '../lib/plans'
import { useAuth } from '../contexts/AuthContext'

const TABS = [
  { id: 'board', label: 'Board' },
  { id: 'log', label: 'Lead Log' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projection', label: 'Projection' },
]

export default function SalesPage() {
  const { user } = useAuth()
  const app = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const plan = effectivePlan(app.subscription, user?.email)
  const allowed = planAllowsFeature(plan, 'email')

  const tab = searchParams.get('tab') || 'board'
  const setTab = (id) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [projection, setProjection] = useState(null)
  const [filters, setFilters] = useState({ from: '', to: '', setter: '', closer: '', source: '' })
  const [teamOpen, setTeamOpen] = useState(false)
  const [importableCount, setImportableCount] = useState(0)
  const [importing, setImporting] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isCreate, setIsCreate] = useState(false)
  const [activeLead, setActiveLead] = useState(null)
  const [form, setForm] = useState(emptyLeadForm())
  const [saving, setSaving] = useState(false)

  const [lossModal, setLossModal] = useState(null) // { lead, stage }
  const [lossReason, setLossReason] = useState('')

  const loadLeads = useCallback(async () => {
    try {
      const data = await listSalesLeads()
      setLeads(data.leads || [])
    } catch (err) {
      toast.error(err.message || 'Could not load leads')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadImportable = useCallback(async () => {
    try {
      const data = await fetchSalesImportable()
      setImportableCount(data.count || 0)
    } catch {
      setImportableCount(0)
    }
  }, [])

  const loadTeam = useCallback(async () => {
    try {
      const data = await fetchSalesTeam()
      setTeam(data.team)
    } catch {
      /* ignore */
    }
  }, [])

  const loadMetrics = useCallback(async () => {
    try {
      const data = await fetchSalesMetrics(filters)
      setMetrics(data.metrics)
    } catch (err) {
      toast.error(err.message || 'Could not load metrics')
    }
  }, [filters])

  const loadProjection = useCallback(
    async (overrides = {}) => {
      try {
        const data = await fetchSalesProjection({ ...filters, ...overrides })
        setProjection(data.projection)
      } catch (err) {
        toast.error(err.message || 'Could not load projection')
      }
    },
    [filters],
  )

  useEffect(() => {
    if (!allowed) return
    loadLeads()
    loadTeam()
    loadImportable()
  }, [allowed, loadLeads, loadTeam, loadImportable])

  useEffect(() => {
    if (!allowed) return
    const inviteToken = searchParams.get('invite')
    if (!inviteToken) return
    let cancelled = false
    acceptSalesTeamInvite(inviteToken)
      .then((data) => {
        if (cancelled) return
        setTeam(data.team)
        toast.success('Joined sales team')
        const next = new URLSearchParams(searchParams)
        next.delete('invite')
        setSearchParams(next, { replace: true })
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Invite failed')
      })
    return () => {
      cancelled = true
    }
    // Only react to invite token presence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, searchParams.get('invite')])

  useEffect(() => {
    if (!allowed) return
    if (tab === 'dashboard') loadMetrics()
    if (tab === 'projection') loadProjection()
  }, [allowed, tab, loadMetrics, loadProjection])

  const openCreate = (stage = 'new') => {
    setIsCreate(true)
    setActiveLead(null)
    setForm(emptyLeadForm({ pipelineStage: stage || 'new' }))
    setDrawerOpen(true)
  }

  const openLead = (lead) => {
    setIsCreate(false)
    setActiveLead(lead)
    setForm(leadToForm(lead))
    setDrawerOpen(true)
  }

  const handleImportMeetings = async () => {
    setImporting(true)
    try {
      const data = await importSalesMeetings()
      const count = data.imported ?? data.count ?? 0
      toast.success(
        count
          ? `Imported ${count} meeting${count === 1 ? '' : 's'} to the board`
          : 'No new meetings to import',
      )
      await loadLeads()
      await loadImportable()
    } catch (err) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const saveLead = async () => {
    const payload = formToPayload(form)
    if (payload.pipelineStage === 'lost' && !payload.lossReason) {
      toast.error('Select a loss reason')
      return
    }
    setSaving(true)
    try {
      if (isCreate) {
        const data = await createSalesLead(payload)
        setLeads((prev) => [data.lead, ...prev])
        toast.success('Lead created')
      } else {
        const data = await updateSalesLead(activeLead.id, payload)
        setLeads((prev) => prev.map((l) => (l.id === data.lead.id ? data.lead : l)))
        toast.success('Lead saved')
      }
      setDrawerOpen(false)
      if (tab === 'dashboard') loadMetrics()
      if (tab === 'projection') loadProjection()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const moveLead = async (leadId, pipelineStage, extra = {}) => {
    const prev = leads
    setLeads((list) =>
      list.map((l) => (l.id === leadId ? { ...l, pipelineStage, ...extra } : l)),
    )
    try {
      const data = await updateSalesLead(leadId, { pipelineStage, ...extra })
      setLeads((list) => list.map((l) => (l.id === data.lead.id ? data.lead : l)))
    } catch (err) {
      setLeads(prev)
      toast.error(err.message || 'Could not move lead')
    }
  }

  const handleStageChange = (lead, stage) => {
    if (stage === 'lost' && !lead.lossReason) {
      setLossModal({ lead, stage })
      setLossReason('')
      return
    }
    moveLead(lead.id, stage)
  }

  const confirmLoss = async () => {
    if (!lossModal || !lossReason) {
      toast.error('Select a loss reason')
      return
    }
    await moveLead(lossModal.lead.id, lossModal.stage, { lossReason })
    setLossModal(null)
  }

  if (!allowed) {
    return (
      <PageShell>
        <PageHeader title="Sales Tracker" subtitle="Pipeline CRM for setters and closers" />
        <PageScroll>
          <div className="mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
            <p className="text-sm text-slate-300">
              Sales Tracker is included with Growth and Pro plans (same as Mail Box).
            </p>
            <Link
              to="/billing"
              className="mt-4 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
            >
              View billing
            </Link>
          </div>
        </PageScroll>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Sales Tracker"
        subtitle="One card per lead — board, log, metrics, and projection"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {importableCount > 0 ? (
              <button
                type="button"
                disabled={importing}
                onClick={handleImportMeetings}
                className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import meetings (${importableCount})`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.04]"
            >
              Team
            </button>
            <button
              type="button"
              onClick={() => openCreate('new')}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              + Lead
            </button>
          </div>
        }
      />

      <div className="border-b border-white/[0.06] px-1">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-white/[0.06] text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <PageScroll>
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading board…</p>
        ) : null}

        {!loading && tab === 'board' ? (
          <SalesBoard
            leads={leads}
            onOpenLead={openLead}
            onMoveLead={(id, stage) => moveLead(id, stage)}
            onNeedLossReason={(lead, stage) => {
              setLossModal({ lead, stage })
              setLossReason('')
            }}
            onQuickAdd={(stage) => openCreate(stage)}
            onImportMeetings={handleImportMeetings}
            onCreateLead={() => openCreate('new')}
            importableCount={importableCount}
            importing={importing}
          />
        ) : null}

        {!loading && tab === 'log' ? (
          <LeadLog leads={leads} onOpenLead={openLead} onStageChange={handleStageChange} />
        ) : null}

        {tab === 'dashboard' ? (
          <SalesDashboard
            metrics={metrics}
            filters={filters}
            onFiltersChange={setFilters}
            teamMembers={team?.members || []}
            onRefresh={loadMetrics}
          />
        ) : null}

        {tab === 'projection' ? (
          <SalesProjection
            projection={projection}
            onReload={(overrides) => loadProjection(overrides)}
          />
        ) : null}
      </PageScroll>

      <LeadDrawer
        open={drawerOpen}
        form={form}
        setForm={setForm}
        lead={activeLead}
        saving={saving}
        teamMembers={team?.members || []}
        isCreate={isCreate}
        onClose={() => setDrawerOpen(false)}
        onSave={saveLead}
        onTouch={
          activeLead
            ? async () => {
                try {
                  const data = await touchSalesLead(activeLead.id)
                  setLeads((prev) => prev.map((l) => (l.id === data.lead.id ? data.lead : l)))
                  setForm(leadToForm(data.lead))
                  toast.success('Last touch updated')
                } catch (err) {
                  toast.error(err.message)
                }
              }
            : undefined
        }
        onDelete={
          activeLead
            ? async () => {
                if (!confirm('Remove this lead from the sales board?')) return
                try {
                  await deleteSalesLead(activeLead.id)
                  setLeads((prev) => prev.filter((l) => l.id !== activeLead.id))
                  setDrawerOpen(false)
                  toast.success('Removed from board')
                } catch (err) {
                  toast.error(err.message)
                }
              }
            : undefined
        }
      />

      <TeamSettings
        open={teamOpen}
        team={team}
        onClose={() => setTeamOpen(false)}
        onUpdated={(t) => setTeam(t)}
      />

      {lossModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={() => setLossModal(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0a0c14] p-5 shadow-xl">
            <h3 className="text-base font-semibold text-white">Loss reason required</h3>
            <p className="mt-1 text-sm text-slate-400">
              Select why {lossModal.lead.name || 'this lead'} was lost.
            </p>
            <select
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              <option value="">Select…</option>
              {LOSS_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLossModal(null)}
                className="px-3 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLoss}
                className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Mark lost
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
