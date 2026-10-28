import { Outlet } from 'react-router-dom'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import WhatsAppFab from '../components/marketing/WhatsAppFab'
import ScrollToTop from '../components/marketing/ScrollToTop'
import ScrollManager from '../components/marketing/ScrollManager'

/** Marketing pages paint immediately — no fade/splash that feels like a loader. */
export default function MarketingLayout() {
  return (
    <div className="min-h-dvh bg-[#05060a] text-slate-200">
      <ScrollManager />
      <MarketingNav />
      <main>
        <Outlet />
      </main>
      <MarketingFooter />
      <WhatsAppFab />
      <ScrollToTop />
    </div>
  )
}
