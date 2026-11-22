import { FileQuestion, NotebookPen } from 'lucide-react'
import type { GradeColumnKind } from '@shigjetademy/shared/grades'

const KIND_CHIP = {
  ASSIGNMENT: { label: 'Assignment', icon: NotebookPen, className: 'bg-green-wash text-green-deep' },
  TEST: { label: 'Test', icon: FileQuestion, className: 'bg-kraft-wash text-kraft-ink' },
} as const satisfies Record<GradeColumnKind, unknown>

interface GradeColumnKindChipProps {
  kind: GradeColumnKind
}

/** Whether a gradebook column is an assignment or a test, with the same icon as its page in the sidebar */
export function GradeColumnKindChip({ kind }: GradeColumnKindChipProps) {
  const { label, icon: Icon, className } = KIND_CHIP[kind]
  return (
    <span className={`inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${className}`}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
      {label}
    </span>
  )
}
