import { Award } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { GroupGrades } from './group-grades'
import { StudentGrades } from './student-grades'

interface GradesPageProps {
  organizationId: string
  organizationName: string
  isStudent: boolean
}

/** A read-only gradebook filled in from marked assignments: lecturers and staff read a group's, students their own */
export function GradesPage({ organizationId, organizationName, isStudent }: GradesPageProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Award} title="Grades" subtitle={`${organizationName} · ${isStudent ? 'your marks in each group' : 'marks for your groups'}`} />
      {isStudent ? <StudentGrades organizationId={organizationId} /> : <GroupGrades organizationId={organizationId} />}
    </div>
  )
}
