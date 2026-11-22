import { FileQuestion } from 'lucide-react'
import type { TestSheet } from '@shigjetademy/shared/tests'
import { isApiError } from '#/api/client'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useRecordResults } from '../hooks/use-record-results'
import { useTestSheet } from '../hooks/use-test-sheet'
import { getPointsLabel } from '../utils/points'
import { getResultsKey } from '../utils/results-form'
import { ResultsSheet } from './results-sheet'

// A malformed id is refused as invalid; to the person it is a test that doesn't exist
const NOT_FOUND_STATUSES = [400, 404]

interface TestSheetPageProps {
  organizationId: string
  testId: string
}

/** One test for its setters: what was set, and every student of the group with their result */
export function TestSheetPage({ organizationId, testId }: TestSheetPageProps) {
  const formatDateTime = useFormatDateTime()
  const sheet = useTestSheet({ organizationId, testId })
  const recordResults = useRecordResults({ organizationId, testId })
  const isNotFound = isApiError(sheet.error) && NOT_FOUND_STATUSES.includes(sheet.error.response?.status ?? 0)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={FileQuestion}
        title={sheet.data?.title ?? 'Test'}
        subtitle={sheet.data ? `${sheet.data.group.name} · ${sheet.data.group.course_name} · ${formatDateTime(sheet.data.held_at)}` : 'A test for a group'}
        backTo={{ to: '/dashboard/tests', label: 'Back to Tests' }}
      />
      <div className="grid max-w-[980px] min-w-0 gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <TestSheetContent sheet={sheet.data} recordResults={recordResults} status={sheet.status} isNotFound={isNotFound} onRetry={() => void sheet.refetch()} />
      </div>
    </div>
  )
}

interface TestSheetContentProps {
  sheet?: TestSheet
  recordResults: ReturnType<typeof useRecordResults>
  status: 'pending' | 'error' | 'success'
  isNotFound: boolean
  onRetry: () => void
}

function TestSheetContent({ sheet, recordResults, status, isNotFound, onRetry }: TestSheetContentProps) {
  if (!sheet) {
    if (isNotFound) return <EmptyMessage icon={FileQuestion} title="Test not found." text="It may have been removed, or the link is old." />
    if (status === 'error') return <LoadError what="test" onRetry={onRetry} />
    return <SkeletonRows />
  }

  return (
    <>
      <p className="flex flex-wrap gap-x-3 text-[0.93rem] text-ink-2">
        <span>{getPointsLabel(sheet.max_points)}</span>
      </p>
      {sheet.description ? <p className="whitespace-pre-wrap break-words">{sheet.description}</p> : null}
      <SectionCard title="Results">
        {sheet.rows.length === 0 ? (
          <EmptyMessage icon={FileQuestion} title="No students in this group." text="Students enrolled in the group show here with their results." />
        ) : (
          // Keyed by the test and every saved result, so a save or a refetch with someone else's results starts the sheet from what is saved now
          <ResultsSheet key={getResultsKey(sheet)} sheet={sheet} recordResults={recordResults} />
        )}
      </SectionCard>
    </>
  )
}
