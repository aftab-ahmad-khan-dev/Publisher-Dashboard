import { SignIn, useAuth } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { clerkAppearance } from "../lib/clerkAppearance";
export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate to='/overview' replace />;
  }

  return (
    <div className='relative flex min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#05060a]'>
      <div className='mesh-bg pointer-events-none absolute inset-0' />
      <div className='pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-sky-600/20 blur-[120px]' />
      <div className='pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-indigo-600/15 blur-[100px]' />

      <div className='relative hidden w-[52%] flex-col justify-between p-14 xl:flex'>
        <div className='flex items-center gap-3'>
          <Link to='/' className='flex items-center gap-2.5 cursor-pointer'>
            <BrandLogo className='h-11 w-11' />
            <span className='font-display text-xl font-bold text-white'>
              Publisher Suite
            </span>
          </Link>
        </div>

        <div>
          <h2 className='font-display max-w-lg text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white'>
            Publish once.
            <span className='mt-1 block bg-gradient-to-r from-sky-400 via-indigo-400 to-indigo-300 bg-clip-text text-transparent'>
              Reach everywhere.
            </span>
          </h2>
          <p className='mt-5 max-w-md text-base leading-relaxed text-slate-400'>
            Meta Suite, LinkedIn, Reddit, and email, one workspace per team,
            engineered for modern brands.
          </p>
        </div>

        <p className='text-xs text-slate-600'>© 2026 Publisher Suite · PWA Ready</p>
      </div>

      <div className='relative flex w-full flex-col justify-center px-6 py-14 lg:w-[48%] lg:px-14'>
        <div className='mx-auto w-full max-w-[420px]'>
          <div className='mb-8 lg:hidden'>
            <BrandLogo className='mb-5 h-12 w-12' />
            <h1 className='font-display text-3xl font-bold text-white'>
              Welcome back
            </h1>
          </div>

          <div className='login-card rounded-3xl p-6 sm:p-8'>
            <SignIn
              routing='path'
              path='/sign-in'
              signUpUrl='/sign-up'
              forceRedirectUrl='/overview'
              appearance={clerkAppearance}
            />
          </div>

          <p className='mt-6 text-center text-xs text-slate-600'>
            New here?{" "}
            <a href='/sign-up' className='text-indigo-400 hover:text-indigo-300'>
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
