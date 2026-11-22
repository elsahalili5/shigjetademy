import type { ReactNode } from 'react'
import type { EdgeAlign } from '../utils/report-charts'

/** The look every chart readout shares: a navy box, its value in white */
export const CHART_TOOLTIP_BOX_CLASS = 'pointer-events-none absolute z-10 grid w-max gap-0.5 rounded-lg bg-navy px-3 py-2 text-left text-[0.88rem] font-normal text-on-navy-2 shadow-lg print:hidden'

interface ChartTooltipProps {
  id: string
  /** Where it sits against its mark */
  placement: 'above' | 'below'
  /** Which edge of its mark it lines up with, so a mark at the chart's edge keeps its tooltip inside the chart */
  align: EdgeAlign
  children: ReactNode
}

const PLACEMENT_CLASS = {
  above: 'bottom-full mb-1.5',
  below: 'top-full mt-1.5',
} as const satisfies Record<ChartTooltipProps['placement'], string>

const ALIGN_CLASS = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
} as const satisfies Record<ChartTooltipProps['align'], string>

/** A mark's readout, shown while its parent group/mark is hovered or holds focus; the value leads. Its text is also the mark's description, and never needed in print. */
export function ChartTooltip({ id, placement, align, children }: ChartTooltipProps) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`${CHART_TOOLTIP_BOX_CLASS} invisible max-w-56 opacity-0 transition-opacity duration-150 group-focus-within/mark:visible group-focus-within/mark:opacity-100 group-hover/mark:visible group-hover/mark:opacity-100 ${PLACEMENT_CLASS[placement]} ${ALIGN_CLASS[align]}`}
    >
      {children}
    </span>
  )
}

/** The tooltip's leading line: the value, strong */
export function ChartTooltipValue({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white">{children}</strong>
}
