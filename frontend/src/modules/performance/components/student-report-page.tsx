import { Printer, TrendingUp } from 'lucide-react'
import type { StudentReport } from '@shigjetademy/shared/grades'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { StudentGroupGrades } from '#/modules/grades/components/student-group-grades'
import { useStudentReport } from '../hooks/use-student-report'
import { isNotFoundError } from '../utils/not-found'
import type { ReportSearch } from '../utils/report-search'
import { formatPercent } from '#/lib/format-number'
import { getGradePoints, getTermAverage } from '../utils/report-charts'
import { getTermLabel } from '../utils/term-label'
import { AverageMeter } from './average-meter'
import { GradeTrendChart } from './grade-trend-chart'

interface StudentReportPageProps {
  organizationId: string
  studentId: string
  /** The term and group picked on Reports: the report covers that term, and the back link returns to both */
  search: ReportSearch
}

/** One student's report for a term, ready to print: their work and average in each group */
export function StudentReportPage({ organizationId, studentId, search }: StudentReportPageProps) {
  const report = useStudentReport({ organizationId, studentId, termId: search.term_id ?? null })
  const backTo = { to: '/dashboard/performance', label: 'Back to reports', search }
  const title = report.data ? `${report.data.student.first_name} ${report.data.student.last_name}` : 'Student report'
  const subtitle = report.data ? getReportSubtitle(report.data) : 'Report'

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto print:h-auto print:overflow-visible">
      <DashboardPageHeader icon={TrendingUp} title={title} subtitle={subtitle} backTo={backTo}>
        {report.data ? (
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={() => window.print()}>
            <Printer size={17} strokeWidth={2} aria-hidden="true" />
            Print
          </button>
        ) : null}
      </DashboardPageHeader>
      <div className="grid gap-4 px-[clamp(20px,3.4vw,44px)] pt-4 pb-10">
        <StudentReportContent report={report.data} status={report.status} isNotFound={isNotFoundError(report.error)} onRetry={() => void report.refetch()} />
      </div>
    </div>
  )
}

const getReportSubtitle = (report: StudentReport) => (report.term ? `Report for ${getTermLabel(report.term)}` : 'Report for every date')

interface StudentReportContentProps {
  report: StudentReport | undefined
  status: 'pending' | 'error' | 'success'
  isNotFound: boolean
  onRetry: () => void
}

function StudentReportContent({ report, status, isNotFound, onRetry }: StudentReportContentProps) {
  if (status === 'error' && isNotFound) return <EmptyMessage icon={TrendingUp} title="Student not found." text="They aren’t in any of the groups you can read reports for." />
  if (status === 'error') return <LoadError what="report" onRetry={onRetry} />
  if (!report) return <SkeletonRows />
  if (report.groups.length === 0) return <EmptyMessage icon={TrendingUp} title="No groups to report on." text="The student’s groups you reach show here." />
  const termAverage = getTermAverage(report.groups)
  const points = getGradePoints(report.groups)
  // Only groups with marked work make up the average
  const averagedGroupCount = report.groups.filter((groupGrades) => !!groupGrades.average).length
  return (
    <>
      <div className="grid gap-1">
        <p className="text-ink-2">Term average</p>
        <p className="text-[3.25rem] leading-none font-semibold">{termAverage ? formatPercent(termAverage.percent) : '—'}</p>
        <p className="text-ink-3">{termAverage ? `${termAverage.points} of ${termAverage.max_points} points across ${averagedGroupCount === 1 ? 'one group' : `${averagedGroupCount} groups`}` : 'Nothing marked yet.'}</p>
      </div>
      <GradeTrendChart points={points} />
      {report.groups.map((groupGrades) => (
        <StudentGroupGrades
          key={groupGrades.group.id}
          groupGrades={groupGrades}
          headerExtra={groupGrades.average ? <AverageMeter average={groupGrades.average} size="card" /> : null}
        />
      ))}
    </>
  )
}
