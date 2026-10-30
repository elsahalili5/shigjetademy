import { AlertCircle, BarChart3, RotateCw } from 'lucide-react'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import type { PlatformStats } from '@shigjetademy/shared/organization'
import { usePlatformStats } from '../hooks/use-platform-stats'
import { MEMBER_ROLE_NOUNS, ORGANIZATION_TYPE_LABELS } from '../utils/labels'

const numberFormat = new Intl.NumberFormat()
const weekFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

const CHART_HEIGHT = 160
const BAR_GAP = 8
const BAR_WIDTH = 28
// Room above the tallest bar for its count
const LABEL_SPACE = 20

/** Statistics: the platform's numbers at a glance, for the platform admin. */
export function StatisticsModule() {
  const stats = usePlatformStats()

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
        <div className="flex items-start gap-4">
          <span
            className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
            aria-hidden="true"
          >
            <BarChart3 size={26} strokeWidth={1.7} />
          </span>
          <div>
            <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">Statistics</h1>
            <p className="mt-1.5 text-ink-2">Organizations and people across Shigjetademy</p>
          </div>
        </div>
      </header>

      <div className="px-[clamp(20px,3.4vw,44px)] pb-10">
        <StatisticsBody status={stats.status} stats={stats.data} onRetry={() => void stats.refetch()} />
      </div>
    </div>
  )
}

interface StatisticsBodyProps {
  status: 'pending' | 'error' | 'success'
  stats?: PlatformStats
  onRetry: () => void
}

function StatisticsBody({ status, stats, onRetry }: StatisticsBodyProps) {
  if (status === 'error') {
    return (
      <div className="grid justify-items-center gap-3 py-16 text-center" role="alert">
        <AlertCircle className="text-coral-deep" size={28} strokeWidth={1.8} aria-hidden="true" />
        <p className="font-semibold">We couldn’t load the statistics.</p>
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onRetry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }

  if (!stats) {
    return <StatisticsSkeleton />
  }

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1">
        <StatTile label="Organizations" value={stats.organizations.total} detail={`${numberFormat.format(stats.organizations.active)} active · ${numberFormat.format(stats.organizations.suspended)} suspended`} />
        <StatTile label="New this month" value={stats.new_organizations_this_month} detail="Organizations that signed up" />
        <StatTile label="Users" value={stats.users_total} detail="Accounts on the platform" />
        <StatTile label="Students" value={stats.members_by_role.STUDENT} detail="Across every organization" />
      </dl>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 max-[1100px]:grid-cols-1">
        <section className="rounded-card border border-rule p-5" aria-labelledby="signups-title">
          <h2 id="signups-title" className="text-[1.15rem] font-[650]">
            New organizations per week
          </h2>
          <p className="mt-1 text-[0.93rem] text-ink-3">Last 12 weeks</p>
          <WeeklyChart weeks={stats.organizations_per_week} />
        </section>

        <div className="grid content-start gap-5">
          <section className="rounded-card border border-rule p-5" aria-labelledby="members-title">
            <h2 id="members-title" className="text-[1.15rem] font-[650]">
              Members by role
            </h2>
            <BreakdownList
              rows={MEMBER_ROLES.map((role) => ({ key: role, label: MEMBER_ROLE_NOUNS[role].other, count: stats.members_by_role[role] }))}
            />
          </section>

          <section className="rounded-card border border-rule p-5" aria-labelledby="types-title">
            <h2 id="types-title" className="text-[1.15rem] font-[650]">
              Organizations by type
            </h2>
            {stats.organizations_by_type.length > 0 ? (
              <BreakdownList
                rows={stats.organizations_by_type.map((group) => ({ key: group.type, label: ORGANIZATION_TYPE_LABELS[group.type], count: group.count }))}
              />
            ) : (
              <p className="mt-3 text-[0.95rem] text-ink-3">No organizations yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

interface StatTileProps {
  label: string
  value: number
  detail: string
}

function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div className="rounded-card border border-rule p-5">
      <dt className="text-[0.93rem] font-semibold text-ink-2">{label}</dt>
      <dd className="tabular mt-2 font-display text-[2.2rem] leading-none font-[680] tracking-[-0.03em]">{numberFormat.format(value)}</dd>
      <dd className="mt-2 text-[0.88rem] text-ink-3">{detail}</dd>
    </div>
  )
}

interface WeeklyChartProps {
  weeks: PlatformStats['organizations_per_week']
}

/** One bar per week; the current week is highlighted */
function WeeklyChart({ weeks }: WeeklyChartProps) {
  const highest = Math.max(1, ...weeks.map((week) => week.count))
  const width = weeks.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const summary = weeks.map((week) => `${weekFormat.format(new Date(week.week_start))}: ${week.count}`).join(', ')

  return (
    <figure className="mt-5">
      <svg className="h-[200px] w-full" viewBox={`0 ${-LABEL_SPACE} ${width} ${CHART_HEIGHT + LABEL_SPACE}`} preserveAspectRatio="none" role="img" aria-label={`New organizations per week. ${summary}`}>
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

interface BreakdownListProps {
  rows: { key: string; label: string; count: number }[]
}

function BreakdownList({ rows }: BreakdownListProps) {
  const highest = Math.max(1, ...rows.map((row) => row.count))
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((row) => (
        <li key={row.key} className="grid gap-1.5">
          <span className="flex justify-between text-[0.95rem]">
            <span className="text-ink-2 first-letter:uppercase">{row.label}</span>
            <span className="tabular font-semibold">{numberFormat.format(row.count)}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-mist" aria-hidden="true">
            <span className="block h-full rounded-full bg-green-deep" style={{ width: `${(row.count / highest) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function StatisticsSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading statistics">
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[124px] animate-pulse rounded-card bg-mist" />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 max-[1100px]:grid-cols-1">
        <div className="h-[300px] animate-pulse rounded-card bg-mist" />
        <div className="h-[300px] animate-pulse rounded-card bg-mist" />
      </div>
    </div>
  )
}
