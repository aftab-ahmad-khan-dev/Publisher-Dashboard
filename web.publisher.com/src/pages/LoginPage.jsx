import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AUTH_USERNAME, AUTH_PASSWORD } from '../lib/constants'

export default function LoginPage() {
  const { login, isAuthenticated, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState(AUTH_USERNAME)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/compose'

  if (ready && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    const result = login(username, password)
    setLoading(false)
    if (result.ok) {
      navigate(from, { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="relative flex h-dvh max-h-dvh overflow-hidden bg-[#05060a]">
      <div className="mesh-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px]" />

      <div className="relative hidden w-[52%] flex-col justify-between p-14 xl:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-purple-600 shadow-xl shadow-fuchsia-500/25">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold text-white">Pulse Publisher</span>
        </div>

        <div>
          <h2 className="font-display max-w-lg text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white">
            Publish once.
            <span className="mt-1 block bg-gradient-to-r from-fuchsia-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
              Reach everywhere.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
            Meta Suite, LinkedIn, and real-time previews — engineered for modern brand teams.
          </p>
        </div>

        <p className="text-xs text-slate-600">© 2026 Pulse Publisher · PWA Ready</p>
      </div>

      <div className="relative flex w-full flex-col justify-center px-6 py-14 lg:w-[48%] lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-bold text-white">Welcome back</h1>
          </div>

          <div className="login-card rounded-3xl p-8 sm:p-10">
            <h2 className="font-display hidden text-2xl font-bold text-white lg:block">Sign in</h2>
            <p className="mt-1 hidden text-sm text-slate-500 lg:block">Access your publishing workspace</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label className="field-label">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-premium"
                  required
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </span>
                ) : (
                  'Enter Dashboard'
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-xs text-slate-600">
              Demo · <span className="text-slate-400">{AUTH_USERNAME}</span> /{' '}
              <span className="text-slate-400">{AUTH_PASSWORD}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
