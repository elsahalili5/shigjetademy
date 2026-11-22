import type { GradeAverage } from '@shigjetademy/shared/grades'
import { isBelowPassMark } from '../utils/report-charts'

interface AverageMeterProps {
  average: GradeAverage
  /** Thin inline in a table row, or a little thicker across a card */
  size: 'inline' | 'card'
}

const SIZE_CLASS = {
  inline: 'h-1.5 w-16',
  card: 'h-2 w-full',
} as const satisfies Record<AverageMeterProps['size'], string>

/** An average as a thin filled bar, red under the pass mark; it sits beside the average's text, which carries the number */
export function AverageMeter({ average, size }: AverageMeterProps) {
  const isBelow = isBelowPassMark(average)
  return (
    <span aria-hidden="true" className={`block overflow-hidden rounded-full [print-color-adjust:exact] ${SIZE_CLASS[size]} ${isBelow ? 'bg-red-wash' : 'bg-green-wash'}`}>
      <span className={`block h-full rounded-full ${isBelow ? 'bg-red' : 'bg-green'}`} style={{ width: `${average.percent}%` }} />
    </span>
  )
}
