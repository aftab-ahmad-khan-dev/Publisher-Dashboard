import { Outlet } from 'react-router-dom'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import WhatsAppFab from '../components/marketing/WhatsAppFab'
import ScrollToTop from '../components/marketing/ScrollToTop'
import ScrollManager from '../components/marketing/ScrollManager'

/** Marketing pages — cream shell matching the product theme. */
export default function MarketingLayout() {
  return (
    <div className="min-h-dvh bg-[#EEEAD7] text-[#2D0000]">
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
