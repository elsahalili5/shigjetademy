import { AlertCircle, RotateCw } from 'lucide-react'

interface LoadErrorProps {
  what: string
  onRetry: () => void
}

/** A section that failed to load, with a way to try again */
export function LoadError({ what, onRetry }: LoadErrorProps) {
  return (
    <div className="grid justify-items-center gap-3 px-5 py-10 text-center" role="alert">
      <AlertCircle className="text-coral-deep" size={24} strokeWidth={1.8} aria-hidden="true" />
      <p className="font-semibold">We couldn’t load the {what}.</p>
      <button type="button" className="button button--ghost min-h-10 px-4 text-base" onClick={onRetry}>
        <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
