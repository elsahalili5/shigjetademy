import { Loader2 } from 'lucide-react'

/** Shown while a stored session is checked, so pages never flash the signed-out state */
export function LoadingUser() {
  return (
    <div className="grid h-svh place-items-center bg-haze text-ink-3" role="status">
      <Loader2 className="animate-[spin_700ms_linear_infinite] motion-reduce:animate-[spin_1600ms_linear_infinite]" size={28} strokeWidth={2} aria-hidden="true" />
      <span className="visually-hidden">Loading your account</span>
    </div>
  )
}
