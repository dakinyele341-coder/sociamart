import { Component } from 'react'

/** Global error boundary — shows a friendly fallback with a Reload button. */
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[SociaMart] UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto grid min-h-[100dvh] max-w-md place-items-center px-6 text-center">
          <div className="space-y-3">
            <img src="/logo/logo-icon.svg" alt="" className="mx-auto h-14 w-14 opacity-70" />
            <h1 className="text-xl font-bold font-display">Something went wrong</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              An unexpected error occurred. Reloading usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white tactile-press"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
