import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ClerkProvider } from '@clerk/clerk-react'
import { AuthProvider } from './contexts/AuthContext'
import { AppDataProvider } from './contexts/AppDataContext'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import MarketingLayout from './layouts/MarketingLayout'
import AuthLayout from './layouts/AuthLayout'
import LandingPage from './pages/LandingPage'
import PricingPage from './pages/marketing/PricingPage'
import AboutPage from './pages/marketing/AboutPage'
import PrivacyPage from './pages/marketing/PrivacyPage'
import TermsPage from './pages/marketing/TermsPage'
import ContactPage from './pages/marketing/ContactPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ComposePage from './pages/ComposePage'
import DraftsPage from './pages/DraftsPage'
import ScheduledPage from './pages/ScheduledPage'
import CalendarPage from './pages/CalendarPage'
import ApiConfigPage from './pages/ApiConfigPage'
import GuidePage from './pages/GuidePage'
import BulkUploadPage from './pages/BulkUploadPage'
import EmailPage from './pages/EmailPage'
import AdminUsersPage from './pages/AdminUsersPage'
import BillingPage from './pages/BillingPage'
import AppToaster from './components/AppToaster'
import AppErrorBoundary from './components/AppErrorBoundary'
import UploadProgressOverlay from './components/UploadProgressOverlay'
import BrandLogo from './components/BrandLogo'
import { clerkAppearance } from './lib/clerkAppearance'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()

/** Group routes into sections so we crossfade between landing/auth/app — but NOT
 *  between dashboard pages (those animate inside DashboardLayout to keep the shell). */
const MARKETING_PATHS = ['/', '/pricing', '/about', '/privacy', '/terms', '/contact']

function sectionKey(pathname) {
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) return 'auth'
  if (MARKETING_PATHS.includes(pathname)) return 'marketing'
  return 'app'
}

function AppRoutes() {
  const location = useLocation()
  const isMarketing = MARKETING_PATHS.includes(location.pathname)
  const isAuth =
    location.pathname.startsWith('/sign-in') || location.pathname.startsWith('/sign-up')

  // Marketing + auth: paint immediately — no boot splash, no route fade.
  if (isMarketing || isAuth) {
    return (
      <Routes location={location}>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/sign-in/*" element={<LoginPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={sectionKey(location.pathname)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        <Routes location={location}>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="compose" element={<ComposePage />} />
              <Route path="bulk" element={<BulkUploadPage />} />
              <Route path="email" element={<EmailPage />} />
              <Route path="drafts" element={<DraftsPage />} />
              <Route path="scheduled" element={<ScheduledPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="api-config" element={<ApiConfigPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/compose" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

/** Clerk needs the router's navigate so its flows (sign-in steps, redirects) stay in-app. */
function ClerkWithRouter({ children }) {
  const navigate = useNavigate()
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  )
}

function MissingKeyScreen() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-[#06080f] px-6 text-center">
      <BrandLogo className="h-14 w-14" />
      <h1 className="font-display text-2xl font-bold text-white">Auth not configured</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        Set <code className="rounded bg-white/10 px-1.5 py-0.5 text-indigo-300">VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-indigo-300">web.publisher.com/.env.local</code>, then restart the dev server.
      </p>
      <a
        href="https://dashboard.clerk.com"
        target="_blank"
        rel="noreferrer"
        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
      >
        Open Clerk dashboard →
      </a>
    </div>
  )
}

export default function App() {
  if (!PUBLISHABLE_KEY) {
    return <MissingKeyScreen />
  }

  return (
    <BrowserRouter>
      <ClerkWithRouter>
        <AuthProvider>
          <AppErrorBoundary>
            {/* Marketing pages: no AppDataProvider, no upload splash, instant paint */}
            <MarketingOrApp />
          </AppErrorBoundary>
        </AuthProvider>
      </ClerkWithRouter>
    </BrowserRouter>
  )
}

function MarketingOrApp() {
  const { pathname } = useLocation()
  const isMarketing = MARKETING_PATHS.includes(pathname)
  const isAuth = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')

  if (isMarketing || isAuth) {
    return (
      <>
        <AppToaster />
        <AppRoutes />
      </>
    )
  }

  return (
    <AppDataProvider>
      <UploadProgressOverlay />
      <AppToaster />
      <AppRoutes />
    </AppDataProvider>
  )
}
