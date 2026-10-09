import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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
      // Prefer expanded labeled nav for the new dock sidebar
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
      <div className="saas-ambient pointer-events-none fixed inset-0" aria-hidden />

      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden overscroll-y-contain px-0 pb-[5.25rem] pt-0 lg:pb-0 lg:pr-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="saas-content-frame flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <PlanGate feature={feature}>
              <Outlet />
            </PlanGate>
          </motion.div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
