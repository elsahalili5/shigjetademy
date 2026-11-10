// Weeks start at midnight UTC, so a local time zone behind UTC would label the day before
const weekFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })

const CHART_HEIGHT = 160
const BAR_GAP = 8
const BAR_WIDTH = 28
// Room above the tallest bar for its count
const LABEL_SPACE = 20

interface WeeklyChartProps {
  /** What each bar counts, read by screen readers before the per-week summary, e.g. "New organizations" */
  metricLabel: string
  weeks: { week_start: string; count: number }[]
}

/** One bar per week; the current week is highlighted */
export function WeeklyChart({ metricLabel, weeks }: WeeklyChartProps) {
  const highest = Math.max(1, ...weeks.map((week) => week.count))
  const width = weeks.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const summary = weeks.map((week) => `${weekFormat.format(new Date(week.week_start))}: ${week.count}`).join(', ')

  return (
    <figure className="mt-5">
      <svg
        className="h-[200px] w-full"
        viewBox={`0 ${-LABEL_SPACE} ${width} ${CHART_HEIGHT + LABEL_SPACE}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${metricLabel} per week. ${summary}`}
      >
        {weeks.map((week, index) => {
          const barHeight = Math.max(2, (week.count / highest) * CHART_HEIGHT)
          const x = index * (BAR_WIDTH + BAR_GAP)
          const isCurrentWeek = index === weeks.length - 1
          return (
            <g key={week.week_start}>
              <rect x={x} y={CHART_HEIGHT - barHeight} width={BAR_WIDTH} height={barHeight} rx={6} className={isCurrentWeek ? 'fill-green-deep' : 'fill-green-wash'} />
              {week.count > 0 ? (
                <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT - barHeight - 6} textAnchor="middle" className="fill-ink-2 text-[11px] font-semibold">
                  {week.count}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-[0.85rem] text-ink-3">
        <span>{weeks[0] ? weekFormat.format(new Date(weeks[0].week_start)) : ''}</span>
        <span>This week</span>
      </figcaption>
    </figure>
  )
}
