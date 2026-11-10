import { BarChart3 } from 'lucide-react'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import type { PlatformStats } from '@shigjetademy/shared/organization'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { usePlatformStats } from '../hooks/use-platform-stats'
import { MEMBER_ROLE_NOUNS, ORGANIZATION_TYPE_LABELS } from '../utils/labels'
import { BreakdownList } from './breakdown-list'
import { StatTile } from './stat-tile'
import { WeeklyChart } from './weekly-chart'

const numberFormat = new Intl.NumberFormat()

/** Statistics: the platform's numbers at a glance, for the platform admin. */
export function StatisticsModule() {
  const stats = usePlatformStats()

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={BarChart3} title="Statistics" subtitle="Organizations and people across Shigjetademy" />

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
    return <LoadError what="statistics" onRetry={onRetry} />
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
          <WeeklyChart metricLabel="New organizations" weeks={stats.organizations_per_week} />
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
