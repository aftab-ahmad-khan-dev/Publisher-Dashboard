import { SignIn, useAuth } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { clerkAppearance } from '../lib/clerkAppearance'

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/overview" replace />
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] overflow-hidden bg-[var(--bg-app)]">
      <div className="relative hidden w-[52%] flex-col justify-between border-r border-white/[0.06] p-14 xl:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo className="h-10 w-10" />
          <span className="text-lg font-semibold tracking-tight text-white">Publisher Suite</span>
        </Link>

        <div>
          <h2 className="max-w-lg text-[2.5rem] font-semibold leading-[1.12] tracking-tight text-white">
            Publish once.
            <span className="mt-1 block text-zinc-400">Reach everywhere.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-500">
            Meta Suite, LinkedIn, Reddit, and email — one workspace per team, built for modern brands.
          </p>
        </div>

        <p className="text-xs text-zinc-600">© 2026 Publisher Suite</p>
      </div>

      <div className="relative flex w-full flex-col justify-center px-6 py-14 lg:w-[48%] lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <BrandLogo className="mb-5 h-11 w-11" />
            <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in to your workspace</p>
          </div>

          <div className="login-card p-6 sm:p-8">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/overview"
              appearance={clerkAppearance}
            />
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            New here?{' '}
            <a href="/sign-up" className="font-medium text-zinc-300 hover:text-white">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
