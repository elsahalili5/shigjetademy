import { FileQuestion } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { GroupTests } from './group-tests'
import { StudentTests } from './student-tests'

interface TestsPageProps {
  organizationId: string
  organizationName: string
  /** The school's time zone, where test days and times are read */
  timeZone: string
  isStudent: boolean
}

/** Paper and in-class tests set for groups: lecturers and staff set them and record the results, students see theirs */
export function TestsPage({ organizationId, organizationName, timeZone, isStudent }: TestsPageProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={FileQuestion} title="Tests" subtitle={`${organizationName} · ${isStudent ? 'tests in your groups' : 'tests you set for your groups'}`} />
      {isStudent ? <StudentTests organizationId={organizationId} /> : <GroupTests organizationId={organizationId} timeZone={timeZone} />}
    </div>
  )
}
