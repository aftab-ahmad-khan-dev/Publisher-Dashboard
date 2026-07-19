import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  updateSalesTeam,
  inviteSalesTeamMember,
  acceptSalesTeamInvite,
} from '../../lib/backendApi'
import { formatMoney } from '../../lib/salesConstants'

const fieldClass =
  'w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40'

export default function TeamSettings({ open, team, onClose, onUpdated }) {
  const [members, setMembers] = useState([])
  const [goal, setGoal] = useState(0)
  const [invite, setInvite] = useState({ email: '', name: '', role: 'both' })
  const [acceptToken, setAcceptToken] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !team) return
    setMembers(team.members || [])
    setGoal(team.revenueGoal || 0)
  }, [open, team])

  if (!open) return null

  const save = async () => {
    setSaving(true)
    try {
      const data = await updateSalesTeam({
        revenueGoal: Number(goal) || 0,
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          commissionPercent: Number(m.commissionPercent) || 0,
          email: m.email || '',
          clerkUserId: m.clerkUserId || '',
        })),
      })
      toast.success('Team saved')
      onUpdated?.(data.team)
    } catch (err) {
      toast.error(err.message || 'Could not save team')
    } finally {
      setSaving(false)
    }
  }

  const sendInvite = async () => {
    if (!invite.email) return
    setSaving(true)
    try {
      const data = await inviteSalesTeamMember(invite)
      toast.success(`Invite created — share token with ${invite.email}`)
      if (data.invite?.token) {
        try {
          await navigator.clipboard.writeText(data.invite.token)
          toast.message('Invite token copied to clipboard')
        } catch {
          /* ignore */
        }
      }
      onUpdated?.(data.team)
      setMembers(data.team?.members || members)
      setInvite({ email: '', name: '', role: 'both' })
    } catch (err) {
      toast.error(err.message || 'Invite failed')
    } finally {
      setSaving(false)
    }
  }

  const accept = async () => {
    if (!acceptToken.trim()) return
    setSaving(true)
    try {
      const data = await acceptSalesTeamInvite(acceptToken.trim())
      toast.success('Joined sales team')
      onUpdated?.(data.team)
      setAcceptToken('')
    } catch (err) {
      toast.error(err.message || 'Could not accept invite')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0a0c14]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Sales team</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <label className="block text-xs text-slate-400">
            Monthly revenue goal
            <input
              type="number"
              disabled={!team?.isOwner}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
            <span className="mt-1 block text-[11px] text-slate-600">
              Current goal: {formatMoney(team?.revenueGoal || 0)}
            </span>
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Roster
              </p>
              {team?.isOwner ? (
                <button
                  type="button"
                  onClick={() =>
                    setMembers((m) => [
                      ...m,
                      { name: '', role: 'both', commissionPercent: 0, email: '' },
                    ])
                  }
                  className="text-xs font-semibold text-indigo-300"
                >
                  + Add
                </button>
              ) : null}
            </div>
            <div className="space-y-2">
              {members.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Name"
                      disabled={!team?.isOwner}
                      value={m.name}
                      onChange={(e) =>
                        setMembers((list) =>
                          list.map((row, i) =>
                            i === idx ? { ...row, name: e.target.value } : row,
                          ),
                        )
                      }
                      className={fieldClass}
                    />
                    <select
                      disabled={!team?.isOwner}
                      value={m.role}
                      onChange={(e) =>
                        setMembers((list) =>
                          list.map((row, i) =>
                            i === idx ? { ...row, role: e.target.value } : row,
                          ),
                        )
                      }
                      className={fieldClass}
                    >
                      <option value="setter">Setter</option>
                      <option value="closer">Closer</option>
                      <option value="both">Both</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Commission %"
                      disabled={!team?.isOwner}
                      value={m.commissionPercent}
                      onChange={(e) =>
                        setMembers((list) =>
                          list.map((row, i) =>
                            i === idx
                              ? { ...row, commissionPercent: e.target.value }
                              : row,
                          ),
                        )
                      }
                      className={fieldClass}
                    />
                    <input
                      placeholder="Email"
                      disabled={!team?.isOwner}
                      value={m.email || ''}
                      onChange={(e) =>
                        setMembers((list) =>
                          list.map((row, i) =>
                            i === idx ? { ...row, email: e.target.value } : row,
                          ),
                        )
                      }
                      className={fieldClass}
                    />
                  </div>
                  {m.linked ? (
                    <p className="mt-1 text-[10px] text-emerald-400">Linked account</p>
                  ) : null}
                  {team?.isOwner ? (
                    <button
                      type="button"
                      onClick={() => setMembers((list) => list.filter((_, i) => i !== idx))}
                      className="mt-2 text-[11px] text-rose-400"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {!members.length ? (
                <p className="text-sm text-slate-600">No roster yet — add setters and closers.</p>
              ) : null}
            </div>
          </div>

          {team?.isOwner ? (
            <div className="space-y-2 rounded-xl border border-white/[0.08] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Invite to shared board
              </p>
              <input
                placeholder="Email"
                value={invite.email}
                onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
                className={fieldClass}
              />
              <input
                placeholder="Name"
                value={invite.name}
                onChange={(e) => setInvite((i) => ({ ...i, name: e.target.value }))}
                className={fieldClass}
              />
              <select
                value={invite.role}
                onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))}
                className={fieldClass}
              >
                <option value="setter">Setter</option>
                <option value="closer">Closer</option>
                <option value="both">Both</option>
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={sendInvite}
                className="rounded-lg border border-indigo-500/40 px-3 py-2 text-xs font-semibold text-indigo-200"
              >
                Create invite token
              </button>
              {(team?.invites || []).length ? (
                <ul className="space-y-1 pt-2 text-[11px] text-slate-500">
                  {team.invites.map((i) => (
                    <li key={i.id || i.token}>
                      Pending: {i.email} · token {String(i.token).slice(0, 8)}…
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl border border-white/[0.08] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Accept invite
            </p>
            <input
              placeholder="Paste invite token"
              value={acceptToken}
              onChange={(e) => setAcceptToken(e.target.value)}
              className={fieldClass}
            />
            <button
              type="button"
              disabled={saving}
              onClick={accept}
              className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-200"
            >
              Join team
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.08] px-4 py-3">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-slate-400">
            Close
          </button>
          {team?.isOwner ? (
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save team'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
