import type { ReactNode } from 'react'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'

interface FormAlertProps {
  children: ReactNode
}

export function FormAlert({ children }: FormAlertProps) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-coral-wash px-3.5 py-3 text-[1.009rem] font-[550] text-coral-deep [&_svg]:mt-0.5 [&_svg]:flex-none" role="alert">
      <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
      {children}
    </p>
  )
}

interface SubmitButtonProps {
  isPending: boolean
  label: string
  pendingLabel: string
}

export function SubmitButton({ isPending, label, pendingLabel }: SubmitButtonProps) {
  return (
    <button className="button mt-1.5 min-h-[52px] w-full bg-navy text-white enabled:hover:bg-navy-2" type="submit" disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="animate-[spin_700ms_linear_infinite] motion-reduce:animate-[spin_1600ms_linear_infinite]" size={18} strokeWidth={2.2} aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
        </>
      )}
    </button>
  )
}
