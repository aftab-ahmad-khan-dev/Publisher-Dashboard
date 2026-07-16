import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { useAuth } from '../contexts/AuthContext'
import { effectivePlan, planAllowsFeature } from '../lib/plans'

/**
 * Blurs page content when the current plan does not include `feature`.
 * Admin always bypasses. Billing is never gated.
 */
export default function PlanGate({ feature, children, preview }) {
  const { subscription } = useAppData()
  const { user } = useAuth()
  const plan = effectivePlan(subscription, user?.email)

  if (!feature || feature === 'billing' || planAllowsFeature(plan, feature)) {
    return children
  }

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden>
        {preview || children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#06080f]/70 p-6 backdrop-blur-[2px]">
        <div className="max-w-md rounded-2xl border border-white/10 bg-[#0c1220] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="font-display mt-4 text-xl font-bold text-white">Upgrade to unlock</h2>
          <p className="mt-2 text-sm text-slate-400">
            This feature is locked on your current plan. Transfer payment and upload your receipt to get access.
          </p>
          <Link
            to="/billing"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            View plans & pay
          </Link>
        </div>
      </div>
    </div>
  )
}
