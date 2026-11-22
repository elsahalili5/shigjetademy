import type { GradeOverview } from '@shigjetademy/shared/grades'
import { formatCount, formatPercent } from '#/lib/format-number'
import { PASS_MARK_PERCENT } from '@shigjetademy/shared/grades'
import { getOverviewStats } from '../utils/report-charts'

interface OverviewStatsProps {
  overview: GradeOverview
}

/** The term at a glance: the average over every group's marked work, the groups, students under the pass mark and missing assignments */
export function OverviewStats({ overview }: OverviewStatsProps) {
  const stats = getOverviewStats(overview)
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Average" value={stats.average ? formatPercent(stats.average.percent) : '—'} />
      <StatTile label="Groups" value={formatCount(stats.groupCount)} />
      <StatTile label={`Students below ${formatPercent(PASS_MARK_PERCENT)}`} value={formatCount(stats.belowPassCount)} />
      <StatTile label="Missing assignments" value={formatCount(stats.missingCount)} />
    </dl>
  )
}

interface StatTileProps {
  label: string
  value: string
}

function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="grid min-w-0 content-start gap-1 rounded-card border border-rule px-4 py-3.5">
      <dt className="text-[0.93rem] text-ink-2">{label}</dt>
      <dd className="text-[1.75rem] leading-tight font-semibold text-ink">{value}</dd>
    </div>
  )
}
