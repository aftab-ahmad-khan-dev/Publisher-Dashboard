import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'
export default function DashboardLayout() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="dashboard-shell flex h-dvh max-h-dvh overflow-hidden bg-[#06080f]">
      <div className="mesh-bg pointer-events-none fixed inset-0" aria-hidden />

      <div
        className={`fixed inset-y-0 left-0 z-50 h-dvh transform transition-transform duration-300 lg:static lg:h-full lg:translate-x-0 ${
          mobileNav ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavigate={() => setMobileNav(false)} />
      </div>

      {mobileNav && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav(false)}
          aria-label="Close menu"
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuOpen={() => setMobileNav(true)} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-3">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
