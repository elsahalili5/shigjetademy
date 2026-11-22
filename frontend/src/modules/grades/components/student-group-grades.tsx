import { useId } from 'react'
import type { StudentGrade, StudentGroupGrades as StudentGroupGradesValue } from '@shigjetademy/shared/grades'
import { useFormatDate } from '#/lib/use-format-date'
import { getColumnDateLabel } from '../utils/column-date-label'
import { formatGradeAverage } from '../utils/format-grade-average'
import { GradeColumnKindChip } from './grade-column-kind-chip'

interface StudentGroupGradesProps {
  groupGrades: StudentGroupGradesValue
  /** h3 when the card sits inside a titled section, like on a child's page */
  headingLevel?: 'h2' | 'h3'
}

/** One group's card: one student's results there by date, with their average */
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
            <StudentGradeItem key={grade.column.id} grade={grade} />
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
  const { column, cell } = grade
  const hasFeedback = (cell.status === 'MARKED' || cell.status === 'ABSENT') && !!cell.feedback
  return (
    <li className="grid gap-1 border-b border-rule px-5 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <GradeColumnKindChip kind={column.kind} />
          <span className="font-[550] wrap-break-word">{column.title}</span>
        </span>
        <StudentGradeResult grade={grade} />
      </div>
      <p className="text-[0.9rem] text-ink-3">
        {getColumnDateLabel(column.kind)} <time dateTime={column.date}>{formatDate(column.date)}</time> · out of {column.max_points}
      </p>
      {hasFeedback ? <p className="whitespace-pre-wrap wrap-break-word text-ink-2">{cell.feedback}</p> : null}
    </li>
  )
}

/** Points out of the max once marked, otherwise where the work or the test stands */
function StudentGradeResult({ grade }: StudentGradeItemProps) {
  const { column, cell } = grade
  switch (cell.status) {
    case 'MARKED':
      return (
        <span className="font-semibold tabular-nums">
          {cell.points ?? 0} / {column.max_points}
        </span>
      )
    case 'HANDED_IN':
      return <span className="text-ink-2">Handed in</span>
    case 'MISSING':
      return <span className="font-semibold text-coral-deep">Missing</span>
    case 'ABSENT':
      return <span className="text-ink-2">Absent</span>
    case 'NOT_RECORDED':
      return <span className="text-ink-3">No result yet</span>
    case 'NOT_DUE':
      return <span className="text-ink-3">{column.kind === 'TEST' ? 'Not held yet' : 'Not due yet'}</span>
    default: {
      const unknown: never = cell.status
      throw new Error(`Unknown grade status: ${String(unknown)}`)
    }
  }
}
