import { useId } from 'react'
import type { StudentPerformance } from '@shigjetademy/shared/grades'
import { formatCount } from '#/lib/format-number'
import { getAverageBands, getBarHeightPercent, getEdgeAlign } from '../utils/report-charts'
import type { AverageBand, AverageBandKey, EdgeAlign } from '../utils/report-charts'
import { BelowPassMarkFlag } from './below-pass-mark-flag'
import { ChartTooltip, ChartTooltipValue } from './chart-tooltip'

// One green, lightest to darkest as averages rise; the band under the pass mark takes the reserved red, with its words
const BAND_CLASS = {
  FAILING: 'bg-red',
  PASSING: 'bg-[color-mix(in_oklab,var(--green)_50%,var(--green-wash))]',
  GOOD: 'bg-green',
  EXCELLENT: 'bg-green-deep',
} as const satisfies Record<AverageBandKey, string>

const studentsLabel = (count: number) => `${formatCount(count)} ${count === 1 ? 'student' : 'students'}`

interface AverageBandsChartProps {
  students: StudentPerformance[]
}

/** How many of the group's students average in each band, as columns */
export function AverageBandsChart({ students }: AverageBandsChartProps) {
  const captionId = useId()
  const bands = getAverageBands(students)
  const max = Math.max(...bands.map((band) => band.count))
  const unmarkedCount = students.filter((student) => !student.average).length
  return (
    <figure aria-labelledby={captionId} className="grid gap-3 rounded-card border border-rule px-4 py-4 [print-color-adjust:exact] sm:px-5">
      <figcaption id={captionId} className="font-semibold">
        Students by average
      </figcaption>
      <ul className="grid grid-cols-4 gap-2 border-b border-rule">
        {bands.map((band, index) => (
          <AverageBandColumn key={band.key} band={band} max={max} tooltipAlign={getEdgeAlign({ index, count: bands.length })} />
        ))}
      </ul>
      <ul className="-mt-1 grid grid-cols-4 gap-2 text-center text-[0.88rem] text-ink-2" aria-hidden="true">
        {bands.map((band) => (
          <li key={band.key} className="grid justify-items-center gap-1">
            <span className="tabular-nums">{band.label}</span>
            {band.isBelowPassMark ? <BelowPassMarkFlag variant="stacked" /> : null}
          </li>
        ))}
      </ul>
      {unmarkedCount > 0 ? <p className="text-[0.9rem] text-ink-3">{studentsLabel(unmarkedCount)} with no marks yet.</p> : null}
    </figure>
  )
}

/** The columns' height; the tallest leaves room above it for its count */
const PLOT_CLASS = 'h-36 pt-7'

interface AverageBandColumnProps {
  band: AverageBand
  max: number
  tooltipAlign: EdgeAlign
}

function AverageBandColumn({ band, max, tooltipAlign }: AverageBandColumnProps) {
  const tooltipId = useId()
  const height = `${getBarHeightPercent({ count: band.count, max })}%`
  return (
    <li className={`flex ${PLOT_CLASS}`}>
      <span className="group/mark relative flex-1">
        <span className="absolute left-1/2 -translate-x-1/2 pb-1 text-[0.93rem] font-semibold tabular-nums" style={{ bottom: height }}>
          {formatCount(band.count)}
        </span>
        <span
          tabIndex={0}
          role="img"
          aria-label={`${band.label}: ${studentsLabel(band.count)}`}
          aria-describedby={tooltipId}
          // A band with nobody keeps a sliver to hover and focus
          className={`absolute bottom-0 left-1/2 block min-h-0.5 w-full max-w-6 -translate-x-1/2 rounded-t-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${BAND_CLASS[band.key]}`}
          style={{ height }}
        />
        <ChartTooltip id={tooltipId} placement="above" align={tooltipAlign}>
          <ChartTooltipValue>{studentsLabel(band.count)}</ChartTooltipValue>
          <span>Averaging {band.label}</span>
        </ChartTooltip>
      </span>
    </li>
  )
}
