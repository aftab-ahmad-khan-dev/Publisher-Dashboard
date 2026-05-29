import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import ScrollToTop from '../components/marketing/ScrollToTop'
import ScrollManager from '../components/marketing/ScrollManager'

export default function MarketingLayout() {
  const location = useLocation()
  return (
    <div className="min-h-dvh bg-[#05060a] text-slate-200">
      <ScrollManager />
      <MarketingNav />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.main>
      <MarketingFooter />
      <ScrollToTop />
    </div>
  )
}
