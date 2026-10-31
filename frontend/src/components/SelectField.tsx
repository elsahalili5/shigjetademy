import type { ComponentProps, ReactNode } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

const SELECT =
  'min-h-[50px] w-full appearance-none rounded-xl border border-rule-strong bg-white pr-10 pl-3.5 text-base transition-[border-color,box-shadow] duration-150 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none disabled:opacity-60 aria-invalid:border-coral-deep'

interface SelectFieldProps extends ComponentProps<'select'> {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

/** A labelled native select with its error under it, styled like the text inputs */
export function SelectField({ id, label, hint, error, children, ...selectProps }: SelectFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={id}>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-3">{hint}</span> : null}
      </label>
      <div className="relative">
        <select id={id} className={SELECT} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} {...selectProps}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3" size={18} strokeWidth={1.9} aria-hidden="true" />
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-[0.95rem] font-[550] text-coral-deep">
          <AlertCircle className="flex-none" size={15} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
