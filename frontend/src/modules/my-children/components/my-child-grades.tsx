import { Award } from 'lucide-react'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { StudentGroupGrades } from '#/modules/grades/components/student-group-grades'
import { useMyChildGrades } from '../hooks/use-my-child-grades'

interface MyChildGradesProps {
  organizationId: string
  studentId: string
}

/** The child's marks from their assignments, one card per group, read-only */
export function MyChildGrades({ organizationId, studentId }: MyChildGradesProps) {
  return (
    <SectionCard title="Grades">
      <MyChildGradesContent organizationId={organizationId} studentId={studentId} />
    </SectionCard>
  )
}

function MyChildGradesContent({ organizationId, studentId }: MyChildGradesProps) {
  const grades = useMyChildGrades({ organizationId, studentId })

  if (grades.status === 'error') return <LoadError what="grades" onRetry={() => void grades.refetch()} />
  if (!grades.data) return <SkeletonRows />
  if (grades.data.length === 0) return <EmptyMessage icon={Award} title="No grades yet" text="When your child’s assignments are marked, the marks show up here." />
  return (
    <div className="grid gap-4 p-5">
      {grades.data.map((groupGrades) => (
        <StudentGroupGrades key={groupGrades.group.id} groupGrades={groupGrades} headingLevel="h3" />
      ))}
    </div>
  )
}
