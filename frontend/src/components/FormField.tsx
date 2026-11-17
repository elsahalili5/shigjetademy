import type { ReactNode } from 'react'
import { FieldError } from '#/modules/auth/components/auth-field'

interface FormFieldProps {
  id: string
  label: string
  hint?: string
  error: string | undefined
  children: ReactNode
}

/** A labelled field with its error under it; the input inside sets aria-describedby to `${id}-error` (see lib/field-props) */
export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={id}>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-3">{hint}</span> : null}
      </label>
      {children}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  )
}
