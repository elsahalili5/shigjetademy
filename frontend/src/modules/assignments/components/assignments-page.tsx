import { NotebookPen } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { GroupAssignments } from './group-assignments'
import { StudentAssignments } from './student-assignments'

interface AssignmentsPageProps {
  organizationId: string
  organizationName: string
  /** The school's time zone, where due days and times are read */
  timeZone: string
  isStudent: boolean
}

/** Homework set for groups: lecturers and staff set and mark it, students hand it in */
export function AssignmentsPage({ organizationId, organizationName, timeZone, isStudent }: AssignmentsPageProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={NotebookPen} title="Assignments" subtitle={`${organizationName} · ${isStudent ? 'homework for your groups' : 'homework you set for your groups'}`} />
      {isStudent ? <StudentAssignments organizationId={organizationId} /> : <GroupAssignments organizationId={organizationId} timeZone={timeZone} />}
    </div>
  )
}
