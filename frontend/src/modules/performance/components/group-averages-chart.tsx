import { useId } from 'react'
import { PASS_MARK_PERCENT } from '@shigjetademy/shared/grades'
import type { GroupPerformance } from '@shigjetademy/shared/grades'
import { formatPercent } from '#/lib/format-number'
import { getGroupLabel } from '#/modules/grades/utils/group-label'
import { getBarWidthPercent, isBelowPassMark, sortGroupsByAverage } from '../utils/report-charts'
import { BelowPassMarkFlag } from './below-pass-mark-flag'
import { ChartTooltip, ChartTooltipValue } from './chart-tooltip'

/** The value column's width, so every bar has the same 0–100% track */
const VALUE_COLUMN = 'grid-cols-[minmax(0,1fr)_3.5rem]'

interface GroupAveragesChartProps {
  groups: GroupPerformance[]
}

/** Each group's average as a bar from 0 to 100%, highest first, against the pass mark */
export function GroupAveragesChart({ groups }: GroupAveragesChartProps) {
  const captionId = useId()
  return (
    <figure aria-labelledby={captionId} className="grid gap-3 rounded-card border border-rule px-4 py-4 [print-color-adjust:exact] sm:px-5">
      <figcaption id={captionId} className="font-semibold">
        Group averages
      </figcaption>
      <div className={`grid ${VALUE_COLUMN} text-[0.85rem] text-ink-3`} aria-hidden="true">
        <span className="relative h-4">
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${PASS_MARK_PERCENT}%` }}>
            Pass mark
          </span>
        </span>
      </div>
      <ul className="grid gap-3">
        {sortGroupsByAverage(groups).map((item) => (
          <GroupAverageBar key={item.group.id} item={item} />
        ))}
      </ul>
    </figure>
  )
}

interface GroupAverageBarProps {
  item: GroupPerformance
}

function GroupAverageBar({ item }: GroupAverageBarProps) {
  const tooltipId = useId()
  const { group, average } = item
  return (
    <li className="grid gap-1">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem]">
        <span className="min-w-0 truncate">
          <span className="font-[550]">{group.name}</span> <span className="text-ink-3">{group.course_name}</span>
        </span>
        {isBelowPassMark(average) ? <BelowPassMarkFlag /> : null}
      </span>
      <div className={`grid ${VALUE_COLUMN} items-center`}>
        <span className="relative h-3">
          <span className="absolute -inset-y-1 border-l border-dashed border-ink-3" style={{ left: `${PASS_MARK_PERCENT}%` }} aria-hidden="true" />
          {average ? (
            <span className="group/mark absolute inset-y-0 left-0 flex" style={{ width: `${getBarWidthPercent(average.percent)}%` }}>
              <span
                tabIndex={0}
                role="img"
                aria-label={`${getGroupLabel(group)}: ${formatPercent(average.percent)}`}
                aria-describedby={tooltipId}
                className={`h-full w-full rounded-r-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${isBelowPassMark(average) ? 'bg-red' : 'bg-green'}`}
              />
              <ChartTooltip id={tooltipId} placement="above" align="start">
                <ChartTooltipValue>{formatPercent(average.percent)}</ChartTooltipValue>
                <span>
                  {average.points} of {average.max_points} points · {group.name}
                </span>
              </ChartTooltip>
            </span>
          ) : (
            <span className="absolute inset-y-0 left-0 flex items-center bg-white pr-2 text-[0.9rem] leading-none text-ink-3">No marks yet</span>
          )}
        </span>
        <span className="pl-2 text-right text-[0.93rem]">{average ? <span className="font-semibold">{formatPercent(average.percent)}</span> : null}</span>
      </div>
    </li>
  )
}
