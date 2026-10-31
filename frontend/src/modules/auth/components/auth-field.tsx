import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

export const INPUT_CLASS =
  'min-h-[50px] w-full rounded-xl border border-rule-strong bg-white px-3.5 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none disabled:opacity-60 aria-invalid:border-coral-deep'

interface AuthFieldProps extends ComponentProps<'input'> {
  id: string
  label: string
  error?: string
}

/** A labelled input with its error under it; password inputs get a show/hide toggle */
export function AuthField({ id, label, error, type, ...inputProps }: AuthFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const errorId = `${id}-error`

  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={isPassword ? `${INPUT_CLASS} pr-[52px]` : INPUT_CLASS}
          type={isPassword && isPasswordVisible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute top-[3px] right-[3px] grid size-11 place-items-center rounded-[10px] bg-transparent text-ink-3 transition-colors duration-150 hover:bg-mist hover:text-ink"
            onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
          </button>
        ) : null}
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

interface FieldErrorProps {
  id: string
  children: ReactNode
}

/** The error line under a field; the field points at it with aria-describedby */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[0.95rem] font-[550] text-coral-deep">
      <AlertCircle className="flex-none" size={15} strokeWidth={2} aria-hidden="true" />
      {children}
    </p>
  )
}
