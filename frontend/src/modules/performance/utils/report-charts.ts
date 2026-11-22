// The numbers behind the Reports charts: totals, sorting, banding and plot geometry. Positions are percentages of the plot, so charts scale with their box.
import type { GradeAverage, GradeOverview, GroupPerformance, StudentGroupGrades, StudentPerformance } from '@shigjetademy/shared/grades'
import { PASS_MARK_PERCENT, PERCENT } from '@shigjetademy/shared/grades'

/** Whether an average is under the pass mark; no average yet is not */
export const isBelowPassMark = (average: GradeAverage | null) => !!average && average.percent < PASS_MARK_PERCENT

type Points = Pick<GradeAverage, 'points' | 'max_points'>

/** Points over max points as an average, or null with nothing to average */
const toAverage = ({ points, max_points }: Points): GradeAverage | null => (max_points === 0 ? null : { points, max_points, percent: Math.round((points / max_points) * PERCENT) })

const sumAverages = (averages: (GradeAverage | null)[]): Points =>
  averages.reduce<Points>((sum, average) => (average ? { points: sum.points + average.points, max_points: sum.max_points + average.max_points } : sum), { points: 0, max_points: 0 })

export type OverviewStats = {
  /** Every group's marked work together, as if the term were one group */
  average: GradeAverage | null
  groupCount: number
  belowPassCount: number
  missingCount: number
}

/** The stat tiles over the overview */
export const getOverviewStats = ({ groups, below_pass_count }: Pick<GradeOverview, 'groups' | 'below_pass_count'>): OverviewStats => ({
  average: toAverage(sumAverages(groups.map((item) => item.average))),
  groupCount: groups.length,
  belowPassCount: below_pass_count,
  missingCount: groups.reduce((sum, item) => sum + item.missing_count, 0),
})

/** The thinnest bar, so a 0% average can still be seen, hovered and focused */
const MIN_BAR_PERCENT = 1

/** A bar's width for an average */
export const getBarWidthPercent = (percent: number) => Math.max(percent, MIN_BAR_PERCENT)

/** Highest average first; groups with nothing marked yet last, each run by name */
export const sortGroupsByAverage = (groups: GroupPerformance[]) =>
  [...groups].sort((first, second) => (second.average?.percent ?? -1) - (first.average?.percent ?? -1) || first.group.name.localeCompare(second.group.name))

export type AverageBandKey = 'FAILING' | 'PASSING' | 'GOOD' | 'EXCELLENT'

/** The bands student averages fall into, lowest first; each starts at min and runs to the next band's min */
const AVERAGE_BANDS = [
  { key: 'FAILING', min: 0, max: PASS_MARK_PERCENT - 1 },
  { key: 'PASSING', min: PASS_MARK_PERCENT, max: 69 },
  { key: 'GOOD', min: 70, max: 84 },
  { key: 'EXCELLENT', min: 85, max: PERCENT },
] as const satisfies readonly { key: AverageBandKey; min: number; max: number }[]

export type AverageBand = {
  key: AverageBandKey
  label: string
  count: number
  isBelowPassMark: boolean
}

/** How many students' averages fall in each band; students with nothing marked are in none */
export const getAverageBands = (students: StudentPerformance[]): AverageBand[] =>
  AVERAGE_BANDS.map(({ key, min, max }) => ({
    key,
    label: `${min}–${max}%`,
    count: students.filter(({ average }) => !!average && average.percent >= min && average.percent <= max).length,
    isBelowPassMark: max < PASS_MARK_PERCENT,
  }))

/** A count's bar height as a percent of the tallest */
export const getBarHeightPercent = ({ count, max }: { count: number; max: number }) => (max === 0 ? 0 : (count / max) * PERCENT)

/** The student's points over max points of marked work across every group */
export const getTermAverage = (groups: StudentGroupGrades[]) => toAverage(sumAverages(groups.map((item) => item.average)))

export type GradePoint = {
  id: string
  title: string
  groupName: string
  date: string
  points: number
  maxPoints: number
  percent: number
}

/** Marked work only, by date: missing work and absences have no percent, as in the average */
export const getGradePoints = (groups: StudentGroupGrades[]): GradePoint[] =>
  groups
    .flatMap(({ group, grades }) =>
      grades.flatMap(({ column, cell }) =>
        cell.status === 'MARKED' && cell.points !== null
          ? [{ id: column.id, title: column.title, groupName: group.name, date: column.date, points: cell.points, maxPoints: column.max_points, percent: Math.round((cell.points / column.max_points) * PERCENT) }]
          : [],
      ),
    )
    .sort((first, second) => first.date.localeCompare(second.date))

export type PlottedPoint = GradePoint & {
  /** 0 at the first date, 100 at the last */
  x: number
  /** 0 at 100%, 100 at 0%, as SVG draws downwards */
  y: number
  /** The strip of the plot that hovers or focuses this point, so the crosshair snaps to the nearest one */
  hitStart: number
  hitEnd: number
}

const CENTRE = 50

/** How far apart marks on the same date sit, so each can be seen */
const SAME_DATE_NUDGE = 2

type DateRun = {
  x: number
  points: GradePoint[]
}

/** Points by date, each date placed by its time between the first and last date */
const toDateRuns = (points: GradePoint[]): DateRun[] => {
  const times = points.map((point) => new Date(point.date).getTime())
  const first = Math.min(...times)
  const span = Math.max(...times) - first
  const runs: (DateRun & { time: number })[] = []
  points.forEach((point, index) => {
    const run = runs.at(-1)
    if (run && run.time === times[index]) {
      run.points.push(point)
      return
    }
    runs.push({ time: times[index], x: span === 0 ? CENTRE : ((times[index] - first) / span) * PERCENT, points: [point] })
  })
  return runs
}

/** The marks of one date nudged apart around its x, kept inside the plot */
const spreadRun = ({ x, count }: { x: number; count: number }) => {
  const offsets = Array.from({ length: count }, (_, index) => x + (index - (count - 1) / 2) * SAME_DATE_NUDGE)
  const shift = Math.max(0, -Math.min(...offsets)) - Math.max(0, Math.max(...offsets) - PERCENT)
  return offsets.map((offset) => offset + shift)
}

/**
 * Each point placed by its date and percent in a 0–100 box, and the line through them. A date's hover strip runs halfway to the dates either side;
 * marks on one date are nudged apart and share its strip equally.
 */
export const getLinePlot = (points: GradePoint[]) => {
  const runs = toDateRuns(points)
  const plotted: PlottedPoint[] = runs.flatMap((run, index) => {
    const previous = runs[index - 1]
    const next = runs[index + 1]
    const start = previous ? (previous.x + run.x) / 2 : 0
    const end = next ? (run.x + next.x) / 2 : PERCENT
    const share = (end - start) / run.points.length
    const xs = spreadRun({ x: run.x, count: run.points.length })
    return run.points.map((point, place) => ({ ...point, x: xs[place], y: PERCENT - point.percent, hitStart: start + place * share, hitEnd: start + (place + 1) * share }))
  })
  return { points: plotted, path: plotted.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') }
}

/** Past the middle, a point's tooltip opens before it */
const TOOLTIP_FLIP_PERCENT = 50

/** Which side of a point at x its tooltip opens, and how much of the plot's width is left that way */
export const getTrendTooltipPlacement = (x: number) => (x > TOOLTIP_FLIP_PERCENT ? { side: 'before' as const, roomPercent: x } : { side: 'after' as const, roomPercent: PERCENT - x })

export type EdgeAlign = 'start' | 'center' | 'end'

/** The first and last marks in a row line their tooltips up with the chart's edges; the rest centre them */
export const getEdgeAlign = ({ index, count }: { index: number; count: number }): EdgeAlign => {
  if (index === 0) return 'start'
  if (index === count - 1) return 'end'
  return 'center'
}
