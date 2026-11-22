import { TriangleAlert } from 'lucide-react'
import { PASS_MARK_PERCENT } from '@shigjetademy/shared/grades'
import { formatPercent } from '#/lib/format-number'

type BelowPassMarkFlagVariant = 'inline' | 'stacked' | 'responsive'

interface BelowPassMarkFlagProps {
  /** On one line with its icon; wrapping under a narrow column without one; or stacked below sm and inline from there */
  variant?: BelowPassMarkFlagVariant
}

const VARIANT_CLASS = {
  inline: 'rounded-full whitespace-nowrap',
  stacked: 'rounded-lg text-center leading-tight',
  responsive: 'rounded-lg text-center leading-tight sm:rounded-full sm:whitespace-nowrap',
} as const satisfies Record<BelowPassMarkFlagVariant, string>

const ICON_CLASS = {
  inline: '',
  stacked: 'hidden',
  responsive: 'hidden sm:block',
} as const satisfies Record<BelowPassMarkFlagVariant, string>

/** The reserved red, always with its words, for an average under the pass mark */
export function BelowPassMarkFlag({ variant = 'inline' }: BelowPassMarkFlagProps) {
  return (
    <span className={`inline-flex flex-none items-center gap-1 bg-red-wash px-2 py-0.5 text-[0.85rem] font-[650] text-red [print-color-adjust:exact] ${VARIANT_CLASS[variant]}`}>
      <TriangleAlert className={ICON_CLASS[variant]} size={14} strokeWidth={2} aria-hidden="true" />
      Below {formatPercent(PASS_MARK_PERCENT)}
    </span>
  )
}
