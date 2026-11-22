import { useId, useState } from 'react'
import type { PointerEvent } from 'react'
import { PASS_MARK_PERCENT, PERCENT } from '@shigjetademy/shared/grades'
import { formatPercent } from '#/lib/format-number'
import { useFormatDate } from '#/lib/use-format-date'
import { getLinePlot, getTrendTooltipPlacement } from '../utils/report-charts'
import type { GradePoint, PlottedPoint } from '../utils/report-charts'
import { CHART_TOOLTIP_BOX_CLASS, ChartTooltipValue } from './chart-tooltip'

/** The plot's y-axis ticks, top to bottom */
const Y_TICKS = [PERCENT, PASS_MARK_PERCENT, 0] as const

/** SVG draws downwards, so the pass mark sits this far from the top */
const PASS_MARK_Y = PERCENT - PASS_MARK_PERCENT

interface GradeTrendChartProps {
  points: GradePoint[]
}

/** The student's percent on each piece of marked work over the term, against the pass mark. Missing work and absences are left out, as in the average. */
export function GradeTrendChart({ points }: GradeTrendChartProps) {
  const captionId = useId()
  const formatDate = useFormatDate()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Nothing marked yet: nothing to plot
  if (points.length === 0) return null

  const plot = getLinePlot(points)
  const active = plot.points.find((point) => point.id === activeId) ?? null
  const first = plot.points[0]
  const last = plot.points.at(-1) ?? first

  // A touch ends right after it lands, and a focused point keeps its readout until focus moves
  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' && !event.currentTarget.contains(document.activeElement)) setActiveId(null)
  }

  return (
    <figure aria-labelledby={captionId} className="grid gap-3 rounded-card border border-rule px-4 py-4 [print-color-adjust:exact] sm:px-5">
      <figcaption id={captionId} className="font-semibold">
        Marks over the term
      </figcaption>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)]">
        <div className="relative h-48 text-[0.8rem] text-ink-3 tabular-nums" aria-hidden="true">
          {Y_TICKS.map((tick) => (
            <span key={tick} className="absolute right-2 -translate-y-1/2" style={{ top: `${PERCENT - tick}%` }}>
              {formatPercent(tick)}
            </span>
          ))}
        </div>
        {/* Room either side so the first and last markers aren't cut */}
        <div className="px-2">
          <div className="relative h-48" onPointerLeave={handlePointerLeave}>
            <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${PERCENT} ${PERCENT}`} preserveAspectRatio="none" aria-hidden="true">
              {Y_TICKS.filter((tick) => tick !== PASS_MARK_PERCENT).map((tick) => (
                <line key={tick} x1={0} x2={PERCENT} y1={PERCENT - tick} y2={PERCENT - tick} stroke="var(--rule-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={0} x2={PERCENT} y1={PASS_MARK_Y} y2={PASS_MARK_Y} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              {active ? <line x1={active.x} x2={active.x} y1={0} y2={PERCENT} stroke="var(--ink-3)" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
              <path d={plot.path} fill="none" stroke="var(--green-deep)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="absolute right-0 -translate-y-full pb-0.5 text-[0.8rem] text-ink-3" style={{ top: `${PASS_MARK_Y}%` }} aria-hidden="true">
              Pass mark
            </span>
            {plot.points.map((point) => (
              <span
                key={point.id}
                aria-hidden="true"
                className={`pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-deep ring-2 ring-white ${point.id === activeId ? 'scale-125' : ''}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              />
            ))}
            {plot.points.map((point) => (
              <span
                key={point.id}
                tabIndex={0}
                role="img"
                aria-label={`${point.title}, ${point.groupName}, ${formatDate(point.date)}: ${point.points} / ${point.maxPoints}, ${formatPercent(point.percent)}`}
                className="absolute inset-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
                style={{ left: `${point.hitStart}%`, width: `${point.hitEnd - point.hitStart}%` }}
                onPointerEnter={() => setActiveId(point.id)}
                onFocus={() => setActiveId(point.id)}
                onBlur={() => setActiveId(null)}
              />
            ))}
            {active ? <TrendTooltip point={active} date={formatDate(active.date)} /> : null}
          </div>
          <div className="mt-1.5 flex justify-between gap-3 text-[0.8rem] text-ink-3">
            <time dateTime={first.date}>{formatDate(first.date)}</time>
            {last.id === first.id ? null : <time dateTime={last.date}>{formatDate(last.date)}</time>}
          </div>
        </div>
      </div>
    </figure>
  )
}

interface TrendTooltipProps {
  point: PlottedPoint
  date: string
}

/** The active point's work and mark, beside it towards the wider side, never wider than the room there */
function TrendTooltip({ point, date }: TrendTooltipProps) {
  const placement = getTrendTooltipPlacement(point.x)
  return (
    <span
      role="tooltip"
      className={`${CHART_TOOLTIP_BOX_CLASS} top-0 ${placement.side === 'before' ? '-ml-3 -translate-x-full' : 'ml-3'}`}
      style={{ left: `${point.x}%`, maxWidth: `min(14rem, calc(${placement.roomPercent}% - 0.75rem))` }}
    >
      <ChartTooltipValue>
        {point.points} / {point.maxPoints} · {formatPercent(point.percent)}
      </ChartTooltipValue>
      <span>{point.title}</span>
      <span>
        {point.groupName} · {date}
      </span>
    </span>
  )
}
