import { useId } from 'react'
import type { StudentGrade, StudentGroupGrades as StudentGroupGradesValue } from '@shigjetademy/shared/grades'
import { useFormatDate } from '#/lib/use-format-date'
import { formatGradeAverage } from '../utils/format-grade-average'

interface StudentGroupGradesProps {
  groupGrades: StudentGroupGradesValue
  /** h3 when the card sits inside a titled section, like on a child's page */
  headingLevel?: 'h2' | 'h3'
}

/** One group's card: one student's results there by due date, with their average */
export function StudentGroupGrades({ groupGrades, headingLevel: Heading = 'h2' }: StudentGroupGradesProps) {
  const headingId = useId()
  const { group, grades, average } = groupGrades
  return (
    <section aria-labelledby={headingId} className="rounded-card border border-rule">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-5 py-4">
        <Heading id={headingId} className="font-semibold">
          {group.name} · {group.course_name}
        </Heading>
        <p className="font-semibold text-ink-2 tabular-nums">{average ? `Average ${formatGradeAverage(average)}` : 'No average yet'}</p>
      </header>
      {grades.length === 0 ? (
        <p className="px-5 py-4 text-ink-2">No marks yet.</p>
      ) : (
        <ul>
          {grades.map((grade) => (
            <StudentGradeItem key={grade.assignment.id} grade={grade} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface StudentGradeItemProps {
  grade: StudentGrade
}

function StudentGradeItem({ grade }: StudentGradeItemProps) {
  const formatDate = useFormatDate()
  const { assignment, cell } = grade
  return (
    <li className="grid gap-1 border-b border-rule px-5 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="font-[550] wrap-break-word">{assignment.title}</span>
        <StudentGradeResult grade={grade} />
      </div>
      <p className="text-[0.9rem] text-ink-3">
        Due <time dateTime={assignment.due_at}>{formatDate(assignment.due_at)}</time> · out of {assignment.max_points}
      </p>
      {cell.status === 'MARKED' && cell.feedback ? <p className="whitespace-pre-wrap wrap-break-word text-ink-2">{cell.feedback}</p> : null}
    </li>
  )
}

/** Points out of the max once marked, otherwise where the work stands */
function StudentGradeResult({ grade }: StudentGradeItemProps) {
  const { assignment, cell } = grade
  switch (cell.status) {
    case 'MARKED':
      return (
        <span className="font-semibold tabular-nums">
          {cell.points ?? 0} / {assignment.max_points}
        </span>
      )
    case 'HANDED_IN':
      return <span className="text-ink-2">Handed in</span>
    case 'MISSING':
      return <span className="font-semibold text-coral-deep">Missing</span>
    case 'NOT_DUE':
      return <span className="text-ink-3">Not due yet</span>
    default: {
      const unknown: never = cell.status
      throw new Error(`Unknown grade status: ${String(unknown)}`)
    }
  }
}
