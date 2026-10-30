import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface FormSuccessProps {
  children: ReactNode
}

export function FormSuccess({ children }: FormSuccessProps) {
  return (
    <p className="flex items-center gap-2 font-[550] text-green-deep" role="status">
      <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />
      {children}
    </p>
  )
}
