import type { GradeAverage as GradeAverageValue } from '@shigjetademy/shared/grades'
import { formatGradeAverage } from '../utils/format-grade-average'

interface GradeAverageProps {
  average: GradeAverageValue | null
}

/** The running average of marked work, or a dash before anything is marked */
export function GradeAverage({ average }: GradeAverageProps) {
  if (!average) return <span className="text-ink-3">—</span>
  return (
    <span className="font-semibold tabular-nums" title={`${average.points} of ${average.max_points} points`}>
      {formatGradeAverage(average)}
    </span>
  )
}
