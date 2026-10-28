import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'
import BottomNav from '../components/layout/BottomNav'
import PlanGate from '../components/PlanGate'
import { featureForPath } from '../lib/plans'

const COLLAPSE_KEY = 'pulse_sidebar_collapsed'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY)
      if (stored == null) return false
      return stored === '1'
    } catch {
      return false
    }
  })
  const location = useLocation()
  const feature = featureForPath(location.pathname)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="dashboard-shell saas-app-shell flex h-dvh max-h-dvh overflow-hidden overscroll-none">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-elevated)]">
        <TopBar />
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden overscroll-y-contain pb-[5.25rem] lg:pb-0">
          <div className="saas-content-frame flex min-h-0 flex-1 flex-col overflow-hidden">
            <PlanGate feature={feature}>
              <Outlet />
            </PlanGate>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
