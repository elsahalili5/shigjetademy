import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface FormAlertProps {
  children: ReactNode
}

/** A form's submit error, shown above its button so it stays next to what the user is fixing */
export function FormAlert({ children }: FormAlertProps) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-coral-wash px-3.5 py-3 text-[1.009rem] font-[550] text-coral-deep [&_svg]:mt-0.5 [&_svg]:flex-none" role="alert">
      <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
      {children}
    </p>
  )
}
