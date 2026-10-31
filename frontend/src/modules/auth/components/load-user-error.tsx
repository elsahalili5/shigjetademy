import { AlertCircle, RotateCw } from 'lucide-react'

interface LoadUserErrorProps {
  onRetry: () => void
}

/** Shown when the stored session couldn't be checked (offline, server error); the session stays so a retry can pick it up */
export function LoadUserError({ onRetry }: LoadUserErrorProps) {
  return (
    <div className="grid h-svh place-items-center bg-haze px-5" role="alert">
      <div className="grid justify-items-center gap-3 text-center">
        <AlertCircle className="text-coral-deep" size={28} strokeWidth={1.8} aria-hidden="true" />
        <p className="font-semibold">We couldn’t load your account.</p>
        <p className="text-ink-2">Check your connection and try again.</p>
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onRetry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  )
}
