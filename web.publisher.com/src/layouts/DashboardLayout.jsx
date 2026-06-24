import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'
import BottomNav from '../components/layout/BottomNav'

const COLLAPSE_KEY = 'pulse_sidebar_collapsed'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="dashboard-shell saas-app-shell flex h-dvh max-h-dvh overflow-hidden">
      <div className="saas-ambient pointer-events-none fixed inset-0" aria-hidden />
      <div className="saas-grid-overlay pointer-events-none fixed inset-0" aria-hidden />

      <div className="hidden h-full lg:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[5.25rem] pt-3 sm:px-4 lg:pb-4 lg:pt-4">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="saas-content-frame flex min-h-0 flex-1 flex-col"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
