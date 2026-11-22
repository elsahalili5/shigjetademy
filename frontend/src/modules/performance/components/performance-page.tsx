import { TrendingUp } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import type { ReportSearch } from '../utils/report-search'
import { GroupOverview } from './group-overview'

interface PerformancePageProps {
  organizationId: string
  organizationName: string
  search: ReportSearch
  onSearchChange: (search: ReportSearch) => void
}

/** Progress reports built from the grades already recorded: how each group did in a term */
export function PerformancePage({ organizationId, organizationName, search, onSearchChange }: PerformancePageProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={TrendingUp} title="Reports" subtitle={`${organizationName} · how your groups are doing`} />
      <GroupOverview organizationId={organizationId} search={search} onSearchChange={onSearchChange} />
    </div>
  )
}
