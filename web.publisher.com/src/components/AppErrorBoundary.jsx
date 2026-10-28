import { Component } from 'react'
import BrandLogo from './BrandLogo'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error boundary:', error, info)
  }

  handleRetry = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    const message =
      this.state.error?.message ||
      'Something went wrong while loading the dashboard.'

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#06080f] px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/40">
          <BrandLogo className="mx-auto h-12 w-12" />
          <h1 className="mt-5 font-display text-xl font-bold text-white">
            We hit a snag
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            The app ran into an unexpected error. Your work is not lost — refresh
            to continue.
          </p>
          <p className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-rose-200/90 break-words">
            {message}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              Reload app
            </button>
            <a
              href="/overview"
              className="btn-secondary px-5 py-2.5 text-sm text-center"
              onClick={() => this.setState({ error: null })}
            >
              Back to compose
            </a>
          </div>
        </div>
      </div>
    )
  }
}
