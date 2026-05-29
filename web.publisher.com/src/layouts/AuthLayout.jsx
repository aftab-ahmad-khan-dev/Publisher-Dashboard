import { Outlet } from 'react-router-dom'
import MarketingNav from '../components/marketing/MarketingNav'

export default function AuthLayout() {
  return (
    <div className="min-h-dvh bg-[#05060a]">
      <MarketingNav />
      <Outlet />
    </div>
  )
}
