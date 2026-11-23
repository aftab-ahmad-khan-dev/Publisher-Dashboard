import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import TopBar from '../components/layout/TopBar'
import BottomNav from '../components/layout/BottomNav'
import PlanGate from '../components/PlanGate'
import { featureForPath } from '../lib/plans'

export default function DashboardLayout() {
  const location = useLocation()
  const feature = featureForPath(location.pathname)

  return (
    <div className="dashboard-shell saas-app-shell flex h-dvh max-h-dvh overflow-hidden overscroll-none">
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F7F7]">
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden overscroll-y-contain pb-[5.25rem] lg:pb-0">
          <div className="saas-content-frame saas-content-frame--wide flex min-h-0 flex-1 flex-col overflow-hidden">
            <TopBar />
            <div className="min-h-0 flex-1 overflow-hidden">
              <PlanGate feature={feature}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname + location.search}
                    className="flex h-full min-h-0 flex-col"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </PlanGate>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
