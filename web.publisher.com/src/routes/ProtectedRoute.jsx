import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import SplashScreen from '../components/SplashScreen'
import BrandLogo from '../components/BrandLogo'

// Dev-only escape hatch to work on the dashboard without logging in.
// Set VITE_DEV_BYPASS_AUTH=true in .env.local; leave unset for normal auth.
const BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

export default function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const [timedOut, setTimedOut] = useState(false)

  // If Clerk's hosted script can't load (offline / CDN blocked), don't hang on
  // the splash forever — surface a clear, retryable error after a grace period.
  useEffect(() => {
    if (isLoaded) return undefined
    const t = setTimeout(() => setTimedOut(true), 12000)
    return () => clearTimeout(t)
  }, [isLoaded])

  if (BYPASS_AUTH) {
    return <Outlet />
  }

  if (!isLoaded) {
    if (timedOut) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-[#06080f] px-6 text-center">
          <BrandLogo className="h-14 w-14" />
          <h1 className="font-display text-2xl font-bold text-white">Can’t reach authentication</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            We couldn’t load the sign-in service. Check your internet connection and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )
    }
    // Branded loading state
    return <SplashScreen visible />
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return <Outlet />
}
