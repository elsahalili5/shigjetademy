import { UsersRound } from 'lucide-react'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useGroupReport } from '../hooks/use-group-report'
import { isNotFoundError } from '../utils/not-found'
import { AverageBandsChart } from './average-bands-chart'
import { GroupReportTable } from './group-report-table'

interface GroupReportProps {
  organizationId: string
  groupId: string
  termId: string | null
}

/** One group's students for the term, or why there is nothing to show */
export function GroupReport({ organizationId, groupId, termId }: GroupReportProps) {
  const report = useGroupReport({ organizationId, groupId, termId })

  if (report.status === 'error' && isNotFoundError(report.error)) return <EmptyMessage icon={UsersRound} title="Group not found." text="It isn’t one of the groups you can read reports for." />
  if (report.status === 'error') return <LoadError what="group’s report" onRetry={() => void report.refetch()} />
  if (!report.data) return <SkeletonRows />
  if (report.data.students.length === 0) return <EmptyMessage icon={UsersRound} title="No students in this group." text="Students enrolled in the group show here." />
  return (
    <>
      <AverageBandsChart students={report.data.students} />
      <GroupReportTable report={report.data} />
    </>
  )
}
