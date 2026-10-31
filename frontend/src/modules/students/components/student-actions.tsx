import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import { getStudentName } from '@shigjetademy/shared/students'
import type { Student, StudentStatus } from '@shigjetademy/shared/students'

export type StudentStatusChange = {
  student: Student
  status: StudentStatus
}

const ACTION_CLASS = 'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink'

interface StudentActionsProps {
  student: Student
  onEdit: (student: Student) => void
  onSetStatus: (change: StudentStatusChange) => void
}

/** Edit, and archive or restore after one confirmation */
export function StudentActions({ student, onEdit, onSetStatus }: StudentActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const name = getStudentName(student)
  const isArchived = student.status === 'ARCHIVED'
  const nextStatus: StudentStatus = isArchived ? 'ACTIVE' : 'ARCHIVED'
  const verb = isArchived ? 'Restore' : 'Archive'

  const handleConfirm = () => {
    setIsConfirming(false)
    onSetStatus({ student, status: nextStatus })
  }

  if (isConfirming) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2" role="group" aria-label={`${verb} ${name}`}>
        <span className="text-[0.93rem] text-ink-2">{isArchived ? 'Back to the active list?' : 'Their record stays.'}</span>
        <button type="button" className="button button--primary min-h-9 px-3.5 text-[0.95rem]" onClick={handleConfirm}>
          {verb}
        </button>
        <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" onClick={() => setIsConfirming(false)}>
          Cancel
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <button type="button" className={ACTION_CLASS} aria-label={`Edit ${name}`} onClick={() => onEdit(student)}>
        <Pencil size={15} strokeWidth={2} aria-hidden="true" />
        <span className="max-[640px]:sr-only">Edit</span>
      </button>
      <button type="button" className={ACTION_CLASS} aria-label={`${verb} ${name}`} onClick={() => setIsConfirming(true)}>
        {isArchived ? <ArchiveRestore size={15} strokeWidth={2} aria-hidden="true" /> : <Archive size={15} strokeWidth={2} aria-hidden="true" />}
        <span className="max-[640px]:sr-only">{verb}</span>
      </button>
    </span>
  )
}
