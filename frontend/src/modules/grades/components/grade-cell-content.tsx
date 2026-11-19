import { useId } from 'react'
import type { GradeCell } from '@shigjetademy/shared/grades'

interface GradeCellContentProps {
  cell: GradeCell
  maxPoints: number
}

/** One result: points out of the max once marked, Handed in, Missing past the due date, or nothing before it */
export function GradeCellContent({ cell, maxPoints }: GradeCellContentProps) {
  switch (cell.status) {
    case 'MARKED':
      return <GradeMark points={cell.points ?? 0} maxPoints={maxPoints} feedback={cell.feedback} />
    case 'HANDED_IN':
      return <span className="text-ink-2">Handed in</span>
    case 'MISSING':
      return <span className="font-semibold text-coral-deep">Missing</span>
    case 'NOT_DUE':
      return null
    default: {
      const unknown: never = cell.status
      throw new Error(`Unknown grade status: ${String(unknown)}`)
    }
  }
}

interface GradeMarkProps {
  points: number
  maxPoints: number
  feedback: string | null
}

/** The points, with the lecturer's feedback shown on hover or keyboard focus and read out as their description */
function GradeMark({ points, maxPoints, feedback }: GradeMarkProps) {
  const feedbackId = useId()
  const label = `${points} / ${maxPoints}`
  if (!feedback) return <span className="font-semibold tabular-nums">{label}</span>
  return (
    <span className="group/mark relative inline-block">
      <span
        tabIndex={0}
        aria-describedby={feedbackId}
        className="cursor-help rounded font-semibold tabular-nums underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
      >
        {label}
      </span>
      <span
        id={feedbackId}
        role="tooltip"
        className="invisible absolute top-full left-1/2 z-10 mt-1.5 w-max max-w-64 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-left text-[0.88rem] font-normal whitespace-pre-wrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/mark:visible group-focus-within/mark:opacity-100 group-hover/mark:visible group-hover/mark:opacity-100"
      >
        {feedback}
      </span>
    </span>
  )
}
