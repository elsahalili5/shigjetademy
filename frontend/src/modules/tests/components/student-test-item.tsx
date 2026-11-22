import { FileQuestion } from 'lucide-react'
import type { StudentTest, TestResult } from '@shigjetademy/shared/tests'
import { useFormatDateTime } from '#/lib/use-format-date'
import { getPointsLabel, getResultPointsLabel } from '../utils/points'

interface StudentTestItemProps {
  test: StudentTest
  /** Held already, so a missing result is worth saying */
  isPast: boolean
}

/** One test for its student: when it is held, its points, and their own result once it is recorded */
export function StudentTestItem({ test, isPast }: StudentTestItemProps) {
  const formatDateTime = useFormatDateTime()

  return (
    <li className="flex gap-4 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-green-wash text-green-deep" aria-hidden="true">
        <FileQuestion size={19} strokeWidth={1.8} />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-semibold break-words">{test.title}</h3>
        <p className="flex flex-wrap gap-x-3 text-[0.93rem] text-ink-2">
          <span>
            {test.group.name} · {test.group.course_name}
          </span>
          <time dateTime={test.held_at}>{formatDateTime(test.held_at)}</time>
          <span>{getPointsLabel(test.max_points)}</span>
        </p>
        {test.description ? <p className="whitespace-pre-wrap break-words">{test.description}</p> : null}
        {test.result ? <StudentTestResult result={test.result} maxPoints={test.max_points} /> : null}
        {!test.result && isPast ? <p className="text-[0.93rem] text-ink-3">No result yet</p> : null}
      </div>
    </li>
  )
}

interface StudentTestResultProps {
  result: TestResult
  maxPoints: number
}

/** The student's own result: their points or that they were absent, and the note */
function StudentTestResult({ result, maxPoints }: StudentTestResultProps) {
  return (
    <div className="mt-1 grid gap-1 rounded-xl bg-mist px-3.5 py-3">
      {result.is_absent ? <p className="font-semibold text-kraft-ink">Absent</p> : null}
      {result.points === null ? null : <p className="font-semibold">{getResultPointsLabel({ points: result.points, maxPoints })}</p>}
      {result.feedback ? <p className="whitespace-pre-wrap break-words">{result.feedback}</p> : null}
    </div>
  )
}
