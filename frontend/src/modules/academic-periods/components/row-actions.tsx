import type { LucideIcon } from 'lucide-react'

const ROW_ACTION_TONES = {
  default: 'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink',
  danger: 'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-coral-deep transition-colors duration-150 hover:bg-coral-wash',
  confirm: 'button min-h-9 bg-coral-deep px-3.5 text-[0.95rem] text-white disabled:opacity-50',
  ghost: 'button button--ghost min-h-9 px-3.5 text-[0.95rem]',
} as const

interface RowActionProps {
  label: string
  tone: keyof typeof ROW_ACTION_TONES
  icon?: LucideIcon
  isDisabled?: boolean
  onClick: () => void
}

export function RowAction({ label, tone, icon: Icon, isDisabled = false, onClick }: RowActionProps) {
  return (
    <button type="button" className={ROW_ACTION_TONES[tone]} disabled={isDisabled} onClick={onClick}>
      {Icon ? <Icon size={15} strokeWidth={2} aria-hidden="true" /> : null}
      {label}
    </button>
  )
}
