import { Award } from 'lucide-react'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useMyGrades } from '../hooks/use-my-grades'
import { StudentGroupGrades } from './student-group-grades'

interface StudentGradesProps {
  organizationId: string
}

/** For students: their own marks, one card per group */
export function StudentGrades({ organizationId }: StudentGradesProps) {
  const grades = useMyGrades(organizationId)

  if (grades.status === 'error') return <LoadError what="grades" onRetry={() => void grades.refetch()} />
  if (!grades.data) return <SkeletonRows />
  if (grades.data.length === 0) return <EmptyMessage icon={Award} title="No grades yet." text="Marks for your groups’ assignments and tests show here." />
  return (
    <div className="grid gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
      {grades.data.map((groupGrades) => (
        <StudentGroupGrades key={groupGrades.group.id} groupGrades={groupGrades} />
      ))}
    </div>
  )
}
